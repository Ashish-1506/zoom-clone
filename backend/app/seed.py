from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.chat_message import ChatMessage
from app.models.meeting import Meeting, MeetingStatus, MeetingType
from app.models.participant import Participant, ParticipantRole
from app.models.user import User
from app.models.user_settings import UserSettings
from app.models.whiteboard import Whiteboard
from app.models.team_chat import ChannelMember, TeamChannel, TeamMessage
from app.models.phone import CallLog, Contact, Voicemail
from app.models.scheduler import Booking, SchedulerLink
from app.schemas.meeting import MeetingCreateScheduled
from app.services.meeting_service import create_scheduled_meeting
from app.schemas.user_settings import UserSettingsData
from app.utils.ids import build_invite_link, generate_meeting_code, generate_passcode
from app.utils.time import utcnow

_USERS = (
    ("Alex Morgan", "alex.morgan@example.com", "#0B5CFF"),
    ("Priya Shah", "priya.shah@example.com", "#7C3AED"),
    ("Jordan Lee", "jordan.lee@example.com", "#0E9F6E"),
    ("Maya Patel", "maya.patel@example.com", "#D97706"),
    ("Ethan Brooks", "ethan.brooks@example.com", "#DB2777"),
    ("Sofia Chen", "sofia.chen@example.com", "#0891B2"),
)

_UPCOMING = (
    ("Weekly Product Sync", "Align on product priorities and unblock the team.", 30),
    ("Design Review", "Review the latest dashboard and meeting-room designs.", 45),
    ("Sprint Planning", "Plan the next sprint and confirm engineering capacity.", 60),
    ("Client Onboarding Call", "Welcome the client and walk through the launch plan.", 45),
    ("Team Standup", "Share progress, priorities, and anything that needs attention.", 30),
)

_PAST = (
    ("Engineering Retrospective", "Discuss wins and improvements from the last sprint.", 60),
    ("Marketing Campaign Review", "Review campaign performance and next experiments.", 45),
    ("Customer Feedback Session", "Capture customer feedback and prioritize follow-ups.", 60),
    ("Roadmap Check-in", "Confirm roadmap milestones with product stakeholders.", 30),
    ("Accessibility Workshop", "Review accessibility improvements across the app.", 45),
    ("Quarterly Planning", "Align on quarterly goals, risks, and ownership.", 60),
)

_SAMPLE_WHITEBOARDS = (
    (
        "Product roadmap",
        '[{"id":"seed-roadmap-1","type":"sticky","x":150,"y":120,"width":210,"height":150,"text":"Q3 launch","color":"#FDE68A","strokeWidth":3},{"id":"seed-roadmap-2","type":"sticky","x":430,"y":120,"width":210,"height":150,"text":"Customer feedback","color":"#BFDBFE","strokeWidth":3},{"id":"seed-roadmap-3","type":"arrow","x":360,"y":195,"width":60,"height":0,"color":"#0B5CFF","strokeWidth":4}]',
    ),
    (
        "Design workshop",
        '[{"id":"seed-workshop-1","type":"ellipse","x":190,"y":145,"width":220,"height":120,"color":"#7C3AED","strokeWidth":4},{"id":"seed-workshop-2","type":"text","x":230,"y":190,"text":"Ideas","color":"#232333","strokeWidth":3},{"id":"seed-workshop-3","type":"rectangle","x":480,"y":130,"width":220,"height":150,"color":"#0B5CFF","strokeWidth":3}]',
    ),
)


def _new_code(db: Session, reserved: set[str]) -> str:
    """Use the production generator while also avoiding pending seed rows."""
    code = generate_meeting_code(db)
    while code in reserved:
        code = generate_meeting_code(db)
    reserved.add(code)
    return code


def _invite_fields(db: Session, reserved: set[str]) -> tuple[str, str, str]:
    code = _new_code(db, reserved)
    passcode = generate_passcode()
    return code, passcode, build_invite_link(code, passcode)


def _add_participant(
    meeting: Meeting,
    user: User,
    role: ParticipantRole,
    joined_at: datetime,
    left_at: datetime | None,
) -> Participant:
    participant = Participant(
        user_id=user.id,
        display_name=user.full_name,
        role=role,
        hand_raised=False,
        hand_raised_at=None,
        last_reaction=None,
        last_reaction_at=None,
        joined_at=joined_at,
        left_at=left_at,
    )
    meeting.participants.append(participant)
    return participant


def seed_database(db: Session) -> dict[str, int]:
    """Seed the local database once when it has no users."""
    if db.scalar(select(func.count(User.id))) != 0:
        return {"users": 0, "meetings": 0, "participants": 0, "messages": 0}

    reserved_codes: set[str] = set()
    users = []
    for index, (full_name, email, color) in enumerate(_USERS, start=1):
        users.append(
            User(
                id=index,
                full_name=full_name,
                email=email,
                avatar_color=color,
                personal_meeting_id=_new_code(db, reserved_codes),
            )
        )
    db.add_all(users)
    db.flush()
    db.add_all(
        UserSettings(user_id=user.id, settings_json=UserSettingsData().model_dump_json())
        for user in users
    )
    db.add_all(
        Whiteboard(owner_id=users[0].id, title=title, data_json=data_json)
        for title, data_json in _SAMPLE_WHITEBOARDS
    )

    now = utcnow()
    meetings: list[Meeting] = []

    upcoming_times = (
        now + timedelta(hours=2),
        now + timedelta(hours=5),
        (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0),
        (now + timedelta(days=3)).replace(hour=15, minute=30, second=0, microsecond=0),
        now + timedelta(days=7),
    )
    for index, ((title, description, duration), start_time) in enumerate(
        zip(_UPCOMING, upcoming_times, strict=True)
    ):
        code, passcode, invite_link = _invite_fields(db, reserved_codes)
        host = users[index % len(users)]
        meeting = Meeting(
            meeting_code=code,
            title=title,
            description=description,
            host_id=host.id,
            meeting_type=MeetingType.SCHEDULED,
            status=MeetingStatus.SCHEDULED,
            start_time=start_time,
            duration_minutes=duration,
            timezone="UTC",
            passcode=passcode,
            invite_link=invite_link,
        )
        _add_participant(meeting, host, ParticipantRole.HOST, now, None)
        db.add(meeting)
        meetings.append(meeting)

    past_meetings: list[Meeting] = []
    for index, (title, description, duration) in enumerate(_PAST):
        started_at = now - timedelta(days=14 - index * 2, hours=index)
        ended_at = started_at + timedelta(minutes=duration)
        code, passcode, invite_link = _invite_fields(db, reserved_codes)
        host = users[(index + 2) % len(users)]
        meeting = Meeting(
            meeting_code=code,
            title=title,
            description=description,
            host_id=host.id,
            meeting_type=MeetingType.SCHEDULED,
            status=MeetingStatus.ENDED,
            start_time=started_at,
            duration_minutes=duration,
            timezone="UTC",
            passcode=passcode,
            invite_link=invite_link,
            started_at=started_at,
            ended_at=ended_at,
        )
        participant_count = 2 + index % 4
        _add_participant(meeting, host, ParticipantRole.HOST, started_at, ended_at)
        for offset in range(1, participant_count):
            user = users[(index + offset + 2) % len(users)]
            _add_participant(
                meeting,
                user,
                ParticipantRole.PARTICIPANT,
                started_at + timedelta(minutes=offset),
                ended_at,
            )
        db.add(meeting)
        past_meetings.append(meeting)

    db.flush()
    for meeting in past_meetings[:2]:
        participants = meeting.participants
        db.add_all(
            [
                ChatMessage(
                    meeting_id=meeting.id,
                    participant_id=participants[0].id,
                    content="Thanks everyone. Let us capture the action items before we wrap.",
                    sent_at=meeting.started_at + timedelta(minutes=10),
                ),
                ChatMessage(
                    meeting_id=meeting.id,
                    participant_id=participants[1].id,
                    content="I will take the follow-up and share an update this afternoon.",
                    sent_at=meeting.started_at + timedelta(minutes=12),
                ),
            ]
        )

    db.commit()
    seed_team_chat(db)
    seed_phone(db, 1)
    seed_scheduler(db, 1)
    summary = {
        "users": len(users),
        "meetings": len(meetings) + len(past_meetings),
        "participants": sum(len(meeting.participants) for meeting in meetings + past_meetings),
        "messages": 4,
    }
    return summary


def seed_whiteboards(db: Session, owner_id: int) -> int:
    """Add the sample board gallery for existing local databases once."""
    if db.scalar(select(func.count(Whiteboard.id)).where(Whiteboard.owner_id == owner_id)):
        return 0
    db.add_all(
        Whiteboard(owner_id=owner_id, title=title, data_json=data_json)
        for title, data_json in _SAMPLE_WHITEBOARDS
    )
    db.commit()
    return len(_SAMPLE_WHITEBOARDS)


def seed_team_chat(db: Session) -> int:
    """Create a small, believable Team Chat workspace once for the local demo."""
    if db.scalar(select(func.count(TeamChannel.id))) or db.scalar(select(func.count(User.id))) < 2:
        return 0
    users = list(db.scalars(select(User).order_by(User.id)))
    by_name = {user.full_name: user for user in users}
    alex = users[0]
    priya = by_name.get("Priya Shah", users[1])
    jordan = by_name.get("Jordan Lee", users[2])
    maya = by_name.get("Maya Patel", users[3])
    now = utcnow()

    channel_specs = (
        ("general", "Company-wide announcements and everyday conversation."),
        ("product", "Product planning, research, and delivery updates."),
        ("random", "The place for non-work discoveries and small wins."),
    )
    channels: dict[str, TeamChannel] = {}
    for name, description in channel_specs:
        channel = TeamChannel(name=name, description=description, created_by=alex.id)
        channel.memberships.extend(ChannelMember(user_id=user.id) for user in users)
        db.add(channel)
        channels[name] = channel
    direct_channels: list[tuple[TeamChannel, User]] = []
    for colleague in (priya, jordan, maya):
        channel = TeamChannel(
            name="direct-message",
            description="",
            is_private=True,
            is_direct=True,
            created_by=alex.id,
        )
        channel.memberships.extend((ChannelMember(user_id=alex.id), ChannelMember(user_id=colleague.id)))
        db.add(channel)
        direct_channels.append((channel, colleague))
    db.flush()

    def message(channel: TeamChannel, sender: User, content: str, minutes_ago: int) -> None:
        db.add(TeamMessage(
            channel_id=channel.id,
            sender_id=sender.id,
            content=content,
            created_at=now - timedelta(minutes=minutes_ago),
        ))

    message(channels["general"], priya, "Good morning, everyone! The customer research recap is ready.", 1660)
    message(channels["general"], alex, "Thanks, Priya. I’ll read it before our afternoon sync.", 1624)
    message(channels["general"], jordan, "Quick reminder: please add your team updates to the weekly doc by noon.", 1410)
    message(channels["general"], maya, "The new onboarding checklist is live. Feedback is welcome!", 110)
    message(channels["product"], jordan, "I’ve added the revised empty states to the prototype.", 1330)
    message(channels["product"], priya, "Nice. The interview feedback strongly supports that direction.", 1305)
    message(channels["product"], alex, "Let’s keep the first version focused and test it with five customers.", 1280)
    message(channels["product"], maya, "I can prepare the release notes and help article draft today.", 104)
    message(channels["product"], jordan, "Perfect — I’ll schedule the usability sessions for next week.", 96)
    message(channels["random"], maya, "Today’s tiny win: finally got my standing desk cable tray installed.", 850)
    message(channels["random"], alex, "That absolutely counts as a major win. Photo or it didn’t happen!", 830)
    message(channels["random"], priya, "Sharing a great article on writing clearer async updates in case anyone wants it.", 70)
    for index, (channel, colleague) in enumerate(direct_channels):
        message(channel, colleague, ("Hey Alex — are you free for a quick review later today?" if index == 0 else "I left a note on the latest draft when you have a moment."), 210 - index * 23)
        message(channel, alex, ("Yes, I can make time after the team sync." if index == 0 else "Thanks, I’ll check it out shortly."), 198 - index * 23)
    db.commit()
    return len(channel_specs) + len(direct_channels)


def seed_phone(db: Session, owner_id: int) -> int:
    """Populate the simulated Zoom Phone workspace once for the default user."""
    if db.scalar(select(func.count(CallLog.id)).where(CallLog.user_id == owner_id)):
        return 0
    owner = db.get(User, owner_id)
    if owner is None:
        return 0
    now = utcnow()
    contacts = (
        ("Priya Shah", "+1 (415) 555-0142", "priya.shah@example.com"),
        ("Jordan Lee", "+1 (415) 555-0189", "jordan.lee@example.com"),
        ("Maya Patel", "+1 (415) 555-0127", "maya.patel@example.com"),
        ("Ethan Brooks", "+1 (415) 555-0161", "ethan.brooks@example.com"),
        ("Sofia Chen", "+1 (415) 555-0194", "sofia.chen@example.com"),
        ("Nora Williams", "+1 (628) 555-0110", "nora.williams@example.com"),
    )
    db.add_all(Contact(owner_id=owner_id, name=name, phone=phone, email=email) for name, phone, email in contacts)
    logs = (
        ("Priya Shah", "+1 (415) 555-0142", "out", 742, 18),
        ("Jordan Lee", "+1 (415) 555-0189", "in", 284, 92),
        ("Nora Williams", "+1 (628) 555-0110", "missed", 0, 230),
        ("Maya Patel", "+1 (415) 555-0127", "out", 96, 1410),
        ("Sofia Chen", "+1 (415) 555-0194", "in", 421, 1630),
        ("Unknown caller", "+1 (510) 555-0199", "missed", 0, 2940),
        ("Ethan Brooks", "+1 (415) 555-0161", "out", 188, 4380),
        ("Priya Shah", "+1 (415) 555-0142", "in", 64, 8700),
    )
    db.add_all(CallLog(
        user_id=owner_id, contact_name=name, phone_number=phone, direction=direction,
        duration_seconds=duration, created_at=now - timedelta(minutes=minutes_ago),
    ) for name, phone, direction, duration, minutes_ago in logs)
    voicemails = (
        ("Nora Williams", "+1 (628) 555-0110", 38, False, 315, "Hi Alex, it’s Nora. I wanted to follow up on the launch timeline. Call me back when you have a minute."),
        ("Sofia Chen", "+1 (415) 555-0194", 22, False, 1460, "Hello! I have a quick question about tomorrow’s review. Nothing urgent — talk soon."),
        ("Priya Shah", "+1 (415) 555-0142", 16, True, 4340, "The client confirmed the new time. I sent the calendar update as well."),
    )
    db.add_all(Voicemail(
        user_id=owner_id, caller_name=name, phone_number=phone, duration_seconds=duration,
        is_listened=listened, created_at=now - timedelta(minutes=minutes_ago), transcript=transcript,
    ) for name, phone, duration, listened, minutes_ago, transcript in voicemails)
    db.commit()
    return len(contacts) + len(logs) + len(voicemails)


def seed_scheduler(db: Session, owner_id: int) -> int:
    """Add two ready-to-share scheduling links and future sample bookings."""
    if db.scalar(select(func.count(SchedulerLink.id)).where(SchedulerLink.owner_id == owner_id)):
        return 0
    if db.get(User, owner_id) is None:
        return 0
    links = (
        SchedulerLink(
            owner_id=owner_id,
            slug="alex-product-chat",
            title="Product chat",
            description="A focused conversation about product priorities and next steps.",
            duration_minutes=30,
            available_days=[0, 1, 2, 3, 4],
            start_hour=9,
            end_hour=17,
            timezone="UTC",
        ),
        SchedulerLink(
            owner_id=owner_id,
            slug="alex-intro-call",
            title="Intro call",
            description="A quick introduction and a chance to learn how we can help.",
            duration_minutes=45,
            available_days=[0, 1, 2, 3, 4, 5],
            start_hour=10,
            end_hour=18,
            timezone="UTC",
        ),
    )
    db.add_all(links)
    db.commit()
    now = utcnow()
    guests = (
        (links[0], "Taylor Kim", "taylor.kim@example.com", 2, 10),
        (links[0], "Morgan Reed", "morgan.reed@example.com", 3, 14),
        (links[1], "Sam Rivera", "sam.rivera@example.com", 5, 11),
    )
    for link, guest_name, guest_email, days, hour in guests:
        start = (now + timedelta(days=days)).replace(hour=hour, minute=0, second=0, microsecond=0)
        meeting = create_scheduled_meeting(
            db,
            owner_id,
            MeetingCreateScheduled(
                title=f"{link.title} with {guest_name}",
                description=f"Scheduled through {link.slug} by {guest_name} ({guest_email}).",
                start_time=start,
                duration_minutes=link.duration_minutes,
                timezone=link.timezone,
            ),
        )
        db.add(Booking(
            link_id=link.id,
            guest_name=guest_name,
            guest_email=guest_email,
            start_time=start,
            end_time=start + timedelta(minutes=link.duration_minutes),
            meeting_id=meeting.id,
            status="confirmed",
        ))
    db.commit()
    return len(links) + len(guests)


def main() -> None:
    """Create tables and seed the configured database from the command line."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)


if __name__ == "__main__":
    main()
