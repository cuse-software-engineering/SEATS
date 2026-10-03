// The routes of the app in one place, so a screen links to another by name and never by a hand-written string.
export const paths = {
  login: '/login',
  rounds: '/',
  round: (id: string) => `/rounds/${id}`,
  booking: (id: string) => `/bookings/${id}`,
  profile: (id: string) => `/bookings/${id}/profile`,
  terms: (id: string) => `/bookings/${id}/terms`,
  payment: (id: string) => `/bookings/${id}/payment`,
  confirmation: (id: string) => `/bookings/${id}/confirmation`,
  myBookings: '/my-bookings',
} as const;
