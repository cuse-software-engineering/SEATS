import { VENUE } from '../../app/venue';

/** What the customer sees behind the login dialog: the Official Account's chat header, a few bubbles and the rich
 *  menu with Reserve a table highlighted. Decoration only, hidden from assistive technology. */
export function LineChatMock() {
  return (
    <>
      <header className="appbar">
        <span className="back" aria-hidden="true">‹</span>
        <img className="avatar" src={VENUE.logoUrl} alt="" />
        <h1>{VENUE.name}</h1>
        <span className="tiny">Official Account</span>
      </header>
      <div className="chat" aria-hidden="true">
        <div className="bubble">Booking for <b>Sat 26 Sep 2026 · 20:00</b> (Artist name) is open now. Tap <b>Reserve a table</b> below.</div>
        <div className="bubble me">Hi, is a 4-person table still free?</div>
        <div className="bubble">Please use the menu below: the map shows what is free right now and your table is held while you pay.</div>
      </div>
      <div className="richmenu" aria-hidden="true">
        <div className="hi">Reserve a table</div>
        <div>My bookings</div>
        <div>Contact us</div>
        <div>Booking terms</div>
      </div>
    </>
  );
}
