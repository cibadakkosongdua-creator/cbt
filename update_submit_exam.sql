-- Update function submit_exam untuk fix BS (Benar/Salah) scoring
-- Jalankan ini di Supabase SQL Editor

CREATE OR REPLACE FUNCTION submit_exam(
  p_student_id TEXT,
  p_mapel TEXT,
  p_mode TEXT,
  p_answers JSONB,
  p_doubtful JSONB,
  p_timeLeft INTEGER,
  p_durationLimit INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_score NUMERIC := 0;
  v_correct NUMERIC := 0;
  v_total INTEGER := 0;
  v_earned_xp INTEGER := 50; -- Base XP (SUBMIT_EXAM)
  v_current_xp INTEGER;
  v_new_level INTEGER;
  v_pass_score INTEGER;
  v_is_lulus BOOLEAN;
  v_result_id TEXT;
  v_q RECORD;
  v_user_ans JSONB;
  v_q_ids TEXT[] := '{}';
  v_exam_config RECORD;
BEGIN
  -- 1. Ambil config ujian
  SELECT * INTO v_exam_config FROM settings WHERE id = 1;
  v_pass_score := COALESCE(v_exam_config.min_score, 70);

  -- 2. Hitung Skor (Server-Side)
  -- Loop semua soal untuk mapel ini
  FOR v_q IN SELECT * FROM questions WHERE LOWER(subtes) = LOWER(p_mapel) LOOP
    v_total := v_total + 1;
    v_q_ids := array_append(v_q_ids, v_q.id::text);
    v_user_ans := p_answers->(v_q.id::text);

    IF v_user_ans IS NOT NULL THEN
      -- PG Scoring
      IF v_q.type = 'PG' THEN
        DECLARE
          v_answer_text TEXT := (v_q.answer->>0)::text;
          v_user_text TEXT := (v_user_ans->>0)::text;
          v_is_letter BOOLEAN := v_answer_text ~ '^[A-E]$';
        BEGIN
          IF v_is_letter THEN
            -- Handle letter answers (A-E)
            DECLARE
              v_user_letter TEXT;
            BEGIN
              v_user_letter := chr(65 + (v_user_text::integer));
              IF UPPER(v_user_letter) = UPPER(v_answer_text) THEN
                v_correct := v_correct + 1;
              END IF;
            END;
          ELSE
            -- Handle numeric answers (0, 1, 2...)
            IF v_user_text = v_answer_text THEN
              v_correct := v_correct + 1;
            END IF;
          END IF;
        END;
      -- PGK Scoring (All or Nothing - partial not supported in RPC yet)
      ELSIF v_q.type = 'PGK' THEN
        IF v_user_ans::text = v_q.answer::text THEN
          v_correct := v_correct + 1;
        END IF;
      -- ISIAN Scoring
      ELSIF v_q.type = 'ISIAN' THEN
        IF LOWER(TRIM(v_user_ans->>0)) = LOWER(TRIM(v_q.answer->>0)) THEN
          v_correct := v_correct + 1;
        END IF;
      -- JODOH Scoring - check each pair index
      ELSIF v_q.type = 'JODOH' THEN
        DECLARE
          v_jodoh_correct BOOLEAN := TRUE;
          v_pair_idx INTEGER := 0;
          v_pairs_count INTEGER;
        BEGIN
          SELECT jsonb_array_length(v_q.pairs) INTO v_pairs_count;
          WHILE v_pair_idx < v_pairs_count LOOP
            IF (v_user_ans->>v_pair_idx::text)::integer IS DISTINCT FROM v_pair_idx THEN
              v_jodoh_correct := FALSE;
              EXIT;
            END IF;
            v_pair_idx := v_pair_idx + 1;
          END LOOP;
          IF v_jodoh_correct THEN
            v_correct := v_correct + 1;
          END IF;
        END;
      -- BS Scoring (Benar/Salah) - FIXED
      ELSIF v_q.type = 'BS' THEN
        DECLARE
          v_bs_correct BOOLEAN := TRUE;
          v_stmt_json JSONB;
          v_idx INTEGER := 0;
        BEGIN
          -- Check each statement
          FOR v_stmt_json IN SELECT jsonb_array_elements(v_q.statements) LOOP
            IF (v_user_ans->>v_idx::text)::boolean IS DISTINCT FROM (v_stmt_json->>'isTrue')::boolean THEN
              v_bs_correct := FALSE;
              EXIT;
            END IF;
            v_idx := v_idx + 1;
          END LOOP;
          IF v_bs_correct THEN
            v_correct := v_correct + 1;
          END IF;
        END;
      END IF;
    END IF;
  END LOOP;

  -- 3. Final Score
  IF v_total > 0 THEN
    v_score := ROUND((v_correct / v_total) * 100);
  END IF;

  -- 4. XP Calculation
  IF v_score >= 100 THEN v_earned_xp := v_earned_xp + 100;
  ELSIF v_score >= 90 THEN v_earned_xp := v_earned_xp + 75;
  END IF;

  IF v_score >= v_pass_score THEN
    v_earned_xp := v_earned_xp + 25;
    v_is_lulus := TRUE;
  ELSE
    v_is_lulus := FALSE;
  END IF;

  -- 5. Update Student XP & Level
  SELECT xp INTO v_current_xp FROM students WHERE id = p_student_id;
  v_current_xp := COALESCE(v_current_xp, 0) + v_earned_xp;
  
  -- Simple level calc: floor(sqrt(xp/100)) + 1 or similar
  v_new_level := FLOOR(v_current_xp / 100) + 1;

  UPDATE students SET xp = v_current_xp, level = v_new_level WHERE id = p_student_id;

  -- 6. Insert Result
  v_result_id := p_student_id || '_' || extract(epoch from now())::text;
  INSERT INTO results (
    id, student_id, student_name, kelas, exam_name, exam_type, subtes,
    mode, answers, score, correct, total, pass_score, duration,
    duration_limit, submitted_at, doubtful, question_ids
  )
  SELECT
    v_result_id, p_student_id, name, kelas, v_exam_config.title, v_exam_config.exam_type, p_mapel,
    p_mode, p_answers, v_score, v_correct, v_total, v_pass_score,
    GREATEST(0, (p_durationLimit - p_timeLeft) / 60), p_durationLimit / 60,
    now(), p_doubtful, to_jsonb(v_q_ids)
  FROM students WHERE id = p_student_id;

  -- 7. Return result
  RETURN jsonb_build_object(
    'score', v_score,
    'correct', v_correct,
    'total', v_total,
    'earnedXp', v_earned_xp,
    'newLevel', v_new_level,
    'isLulus', v_is_lulus,
    'id', v_result_id
  );
END;
$$ LANGUAGE plpgsql;
