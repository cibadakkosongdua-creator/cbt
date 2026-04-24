import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Hanya izinkan Vercel Cron atau Secret Key
  // if (req.headers['x-vercel-cron'] !== '1') {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  )

  try {
    const now = new Date().toISOString();

    // 1. Cari ujian yang sudah melewati end_at tapi masih aktif
    const { data: expiredSessions, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .lt('time_left', 0); // Atau logika berdasarkan settings.end_at

    // 2. Jika ada, paksa submit (trigger force_submit)
    if (expiredSessions?.length > 0) {
      await supabase
        .from('sessions')
        .update({ force_submit: true })
        .in('id', expiredSessions.map(s => s.id));
    }

    return res.status(200).json({ 
      success: true, 
      processed: expiredSessions?.length || 0 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
