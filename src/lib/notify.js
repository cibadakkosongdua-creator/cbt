import Swal from 'sweetalert2';

export const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2200,
  timerProgressBar: true,
  didOpen: (el) => {
    el.addEventListener('mouseenter', Swal.stopTimer);
    el.addEventListener('mouseleave', Swal.resumeTimer);
  },
});

export function toastSuccess(title = 'Berhasil') {
  return toast.fire({ icon: 'success', title });
}

export function toastError(title = 'Terjadi kesalahan') {
  return toast.fire({ icon: 'error', title });
}

export function toastInfo(title = 'Info') {
  return toast.fire({ icon: 'info', title });
}

