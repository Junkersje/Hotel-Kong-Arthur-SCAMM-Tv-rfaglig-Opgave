/**
 * BookingList React-komponent (SH-20 / T020, SH-27 / T027, SH-32 / T032)
 * Kompatibilitets-entrypoint i components/ der eksporterer MVVM BookingListView
 * med søgning, filtrering, EditBookingModal og DeleteDialog koblet til handlingsknapperne.
 */

import BookingListView from '../views/BookingListView.jsx';

export { BookingListView as BookingList };
export default BookingListView;
