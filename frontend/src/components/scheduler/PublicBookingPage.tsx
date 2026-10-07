"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, CheckCircle2, Clock3, LoaderCircle, Video } from "lucide-react";

import { Button, Input, Spinner } from "@/components/ui";
import { bookSchedulerSlot, getPublicSchedulerLink, listPublicSchedulerSlots } from "@/lib/api";
import type { BookingConfirmation, PublicSchedulerLink, SchedulerSlot } from "@/lib/types";
import { SchedulerCalendar } from "./SchedulerCalendar";

function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function PublicBookingPage({ slug }: { slug: string }) {
  const [link, setLink] = useState<PublicSchedulerLink | null>(null);
  const [month, setMonth] = useState(() => new Date(todayLocal().getFullYear(), todayLocal().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayLocal);
  const [slots, setSlots] = useState<SchedulerSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SchedulerSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [slotError, setSlotError] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [booking, setBooking] = useState(false);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const loadLink = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setLink(await getPublicSchedulerLink(slug));
    } catch (caughtError: unknown) {
      setLink(null);
      setLoadError(caughtError instanceof Error ? caughtError.message : "This booking page is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    document.title = "Book a meeting | Zoom Workplace";
    const timer = window.setTimeout(() => void loadLink(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLink]);

  useEffect(() => {
    if (link) document.title = `Book ${link.title} | Zoom Workplace`;
  }, [link]);

  const loadSlots = useCallback(async () => {
    if (!link) return;
    setSlotsLoading(true);
    setSlotError("");
    setSelectedSlot(null);
    try {
      setSlots(await listPublicSchedulerSlots(slug, localDateKey(selectedDate)));
    } catch (caughtError: unknown) {
      setSlotError(caughtError instanceof Error ? caughtError.message : "Could not load available times.");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [link, selectedDate, slug]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSlots(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSlots]);

  const submitBooking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlot || booking) return;
    setBooking(true);
    setSlotError("");
    try {
      setConfirmation(await bookSchedulerSlot(slug, {
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        start_time: selectedSlot.start_time,
      }));
    } catch (caughtError: unknown) {
      setSelectedSlot(null);
      setSlotError(caughtError instanceof Error ? caughtError.message : "This time is no longer available. Choose another time.");
      await loadSlots();
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-zoom-bg"><Spinner /></main>;
  }

  if (!link) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zoom-bg p-6 text-center">
        <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-zoom-text">Booking page unavailable</h1>
          <p role="alert" className="mt-2 text-sm text-zoom-muted">{loadError || "This scheduling link cannot be found."}</p>
          <Button className="mt-5" onClick={() => void loadLink()}>Try again</Button>
        </section>
      </main>
    );
  }

  if (confirmation) return <BookingConfirmationCard link={link} booking={confirmation} />;

  return (
    <main className="min-h-screen bg-zoom-bg px-4 py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-[0.82fr_1.18fr]">
        <aside className="border-b border-zoom-border p-7 md:border-b-0 md:border-r sm:p-10">
          <div className="flex size-11 items-center justify-center rounded-lg bg-zoom-blue text-xl font-black text-white">Z</div>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-zoom-text">{link.title}</h1>
          <p className="mt-3 text-sm leading-6 text-zoom-muted">{link.description || "Choose a time that works for you."}</p>
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-zoom-text"><Clock3 className="size-4 text-zoom-muted" />{link.duration_minutes} minutes</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-bold text-zoom-text"><CalendarDays className="size-4 text-zoom-muted" />{link.timezone}</p>
        </aside>
        <section className="p-5 sm:p-8">
          <h2 className="text-xl font-black text-zoom-text">Select a date & time</h2>
          <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_180px]">
            <SchedulerCalendar
              month={month}
              selectedDate={selectedDate}
              availableDays={link.available_days}
              onMonthChange={setMonth}
              onSelectDate={(date) => { setSelectedDate(date); setSlotError(""); }}
            />
            <div>
              <p className="mb-3 text-sm font-bold text-zoom-text">
                {selectedDate.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
              </p>
              <div className="max-h-[270px] space-y-2 overflow-y-auto pr-1">
                {slotsLoading ? (
                  <div className="flex justify-center py-8"><LoaderCircle className="size-5 animate-spin text-zoom-blue" /></div>
                ) : slotError ? (
                  <div className="py-4 text-center">
                    <p role="alert" className="text-sm text-zoom-red">{slotError}</p>
                    <Button size="sm" variant="secondary" className="mt-3" onClick={() => void loadSlots()}>Retry</Button>
                  </div>
                ) : slots.map((slot) => (
                  <button key={slot.start_time} type="button" onClick={() => setSelectedSlot(slot)} className={`min-h-11 w-full rounded-md border px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue ${selectedSlot?.start_time === slot.start_time ? "border-zoom-blue bg-zoom-blue text-white" : "border-zoom-blue text-zoom-blue hover:bg-zoom-blue-light"}`}>
                    {slot.label}
                  </button>
                ))}
                {!slotsLoading && !slotError && slots.length === 0 && <p className="py-5 text-sm text-zoom-muted">No times available on this date.</p>}
              </div>
            </div>
          </div>

          {selectedSlot && (
            <BookingDetailsForm
              slot={selectedSlot}
              name={guestName}
              email={guestEmail}
              error={slotError}
              booking={booking}
              onNameChange={setGuestName}
              onEmailChange={setGuestEmail}
              onSubmit={submitBooking}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function BookingDetailsForm({
  slot, name, email, error, booking, onNameChange, onEmailChange, onSubmit,
}: {
  slot: SchedulerSlot;
  name: string;
  email: string;
  error: string;
  booking: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}) {
  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mt-8 border-t border-zoom-border pt-6">
      <h3 className="text-lg font-black text-zoom-text">Your details</h3>
      <p className="mt-1 text-sm text-zoom-muted">
        {new Date(slot.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input id="booking-guest-name" label="Name" required maxLength={120} autoComplete="name" value={name} onChange={(event) => onNameChange(event.target.value)} />
        <Input id="booking-guest-email" label="Email" required type="email" maxLength={255} autoComplete="email" value={email} onChange={(event) => onEmailChange(event.target.value)} />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-zoom-red">{error}</p>}
      <Button type="submit" className="mt-5 w-full sm:w-auto" disabled={!name.trim() || !email.trim()} loading={booking}>
        Schedule event
      </Button>
    </form>
  );
}

function BookingConfirmationCard({ link, booking }: { link: PublicSchedulerLink; booking: BookingConfirmation }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zoom-bg p-4">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto size-14 text-zoom-green" />
        <p className="mt-5 text-sm font-bold text-zoom-green">BOOKING CONFIRMED</p>
        <h1 className="mt-2 text-3xl font-black text-zoom-text">You’re on the calendar!</h1>
        <p className="mt-4 text-zoom-muted">
          {link.title} is booked for{" "}
          <strong>{new Date(booking.start_time).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: link.timezone })}</strong>.
        </p>
        <a href={booking.meeting_link} className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-zoom-blue px-4 py-2 text-sm font-bold text-white hover:bg-zoom-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zoom-blue">
          <Video className="size-4" />Open Zoom meeting
        </a>
        <p className="mt-4 text-xs text-zoom-muted">Meeting details are ready for {booking.guest_email}.</p>
      </section>
    </main>
  );
}
