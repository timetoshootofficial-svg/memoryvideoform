# Dashboard formulas

`setupDashboard_()` writes all of these, and it works out the column letters
from the header names, so they stay correct even if you move a column. This
file is for reference.

The Bookings layout it assumes:

| Col | Header | Col | Header |
|---|---|---|---|
| A | BookingID | M | Total |
| B | CreatedAt | N | Status |
| C | Name | O | HoldUntil |
| D | Phone | P | UTM_Source |
| E | Occasion | Q | UTM_Medium |
| F | EventDate | R | UTM_Campaign |
| G | FilmLength | S | UTM_Content |
| H | DeliveryDate | T | AdID |
| I | SlotTime | U | fbclid |
| J | Units | V | Referrer |
| K | Price | W | Language |
| L | FollowerDiscount | X | Notes |

## Funnel block (A3:B19)

| Cell | Label | Formula |
|---|---|---|
| B4 | Visits | `=COUNTIF(Funnel!C:C,"page_view")` |
| B5 | Unique sessions | `=IFERROR(COUNTA(UNIQUE(FILTER(Funnel!B2:B,Funnel!B2:B<>""))),0)` |
| B6 | Form starts | `=COUNTIF(Funnel!C:C,"form_start")` |
| B7 | Reached film length | `=COUNTIF(Funnel!C:C,"step_3")` |
| B8 | Reached calendar | `=COUNTIF(Funnel!C:C,"step_4")` |
| B9 | Picked a date | `=COUNTIF(Funnel!C:C,"date_selected")` |
| B10 | Picked a time | `=COUNTIF(Funnel!C:C,"time_selected")` |
| B11 | Slots reserved | `=COUNTIF(Funnel!C:C,"booking_created")` |
| B12 | WhatsApp opened | `=COUNTIF(Funnel!C:C,"whatsapp_redirect")` |
| B19 | Slot-taken clashes | `=COUNTIF(Funnel!C:C,"slot_taken")` |

`Picked a date` and `Picked a time` are the two halves of the calendar step.
A big drop between them means your time slots do not suit people — change
`time_slots` in Config and watch it again.

## Conversion block (A13:B17), formatted as percentages

| Cell | Label | Formula |
|---|---|---|
| B14 | Visit → form start | `=IFERROR(B6/B4,"")` |
| B15 | Form start → calendar | `=IFERROR(B8/B6,"")` |
| B16 | Calendar → reservation | `=IFERROR(B11/B8,"")` |
| B17 | Visit → reservation | `=IFERROR(B11/B4,"")` |

## Status and value block (C3:D16)

Status is column **N**, Total is column **M**.

| Cell | Label | Formula |
|---|---|---|
| D4 | Pending (not yet confirmed) | `=COUNTIF(Bookings!N:N,"Pending")` |
| D5 | Confirmed | `=COUNTIF(Bookings!N:N,"Confirmed")` |
| D6 | Paid | `=COUNTIF(Bookings!N:N,"Paid")` |
| D7 | Cancelled | `=COUNTIF(Bookings!N:N,"Cancelled")` |
| D8 | Expired (hold ran out) | `=COUNTIF(Bookings!N:N,"Expired")` |
| D9 | Total rows | `=COUNTA(Bookings!A2:A)` |
| D12 | Paid | `=SUMIF(Bookings!N:N,"Paid",Bookings!M:M)` |
| D13 | Confirmed, not yet paid | `=SUMIF(Bookings!N:N,"Confirmed",Bookings!M:M)` |
| D14 | Reserved, unconfirmed | `=SUMIF(Bookings!N:N,"Pending",Bookings!M:M)` |
| D15 | Avg paid value | `=IFERROR(D12/D6,"")` |
| D16 | To chase today | `=IFERROR(D13+D14,"")` |

**Reserved, unconfirmed** is the number that matters most on this page: money
sitting in reservations nobody has spoken to yet. Work it down daily, because
every one of those expires after `slot_hold_hours`.

## By campaign (A23)

```
=IFERROR(QUERY({Bookings!R2:R,Bookings!N2:N,Bookings!M2:M},
"select Col1, count(Col2), sum(Col3) where Col1 is not null and Col1 != ''
group by Col1 order by count(Col2) desc
label Col1 'Campaign', count(Col2) 'Reservations', sum(Col3) 'Value'",0),"No campaign data yet")
```

## By occasion (F23)

```
=IFERROR(QUERY({Bookings!E2:E,Bookings!M2:M},
"select Col1, count(Col1), sum(Col2) where Col1 is not null and Col1 != ''
group by Col1 order by count(Col1) desc
label Col1 'Occasion', count(Col1) 'Reservations', sum(Col2) 'Value'",0),"No reservations yet")
```

## Upcoming, Confirmed and Paid (A36)

```
=IFERROR(SORT(FILTER({Bookings!H2:H,Bookings!I2:I,Bookings!A2:A,Bookings!C2:C,Bookings!G2:G,Bookings!N2:N},
Bookings!H2:H<>"",(Bookings!N2:N="Confirmed")+(Bookings!N2:N="Paid")),1,TRUE),"Nothing confirmed yet")
```

## To chase, still Pending (A41)

Your daily call list: date, time, reference, name and phone number.

```
=IFERROR(SORT(FILTER({Bookings!H2:H,Bookings!I2:I,Bookings!A2:A,Bookings!C2:C,Bookings!D2:D},
Bookings!N2:N="Pending"),1,TRUE),"Nothing waiting")
```
