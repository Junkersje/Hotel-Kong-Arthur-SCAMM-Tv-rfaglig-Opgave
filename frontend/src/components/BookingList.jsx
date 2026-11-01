/**
 * BookingList React-komponent (SH-20 / T020, SH-27 / T027)
 * Kompatibilitets-entrypoint i components/ der eksporterer MVVM BookingListView
 * med EditBookingModal koblet til redigeringsknappen og automatisk refresh af listen.
 */

import BookingListView from '../views/BookingListView.jsx';

export { BookingListView as BookingList };
export default BookingListView;
