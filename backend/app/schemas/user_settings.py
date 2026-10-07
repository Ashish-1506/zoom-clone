from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class UserSettingsData(BaseModel):
    """Validated settings shared by the frontend preference controls."""

    model_config = ConfigDict(extra="forbid")

    start_video_on: bool = True
    use_24_hour_time: bool = False
    confirm_leave: bool = True
    theme: Literal["light", "dark"] = "light"
    camera_device_id: str = ""
    mirror_video: bool = True
    display_participant_names: bool = True
    microphone_device_id: str = ""
    speaker_device_id: str = ""
    input_volume: int = Field(default=75, ge=0, le=100)
    mute_mic_on_join: bool = False
    show_message_preview: bool = True
    play_message_sound: bool = True
    virtual_background: Literal[
        "none", "blur", "gradient-1", "gradient-2", "gradient-3", "gradient-4"
    ] = "none"
    share_screen_audio: bool = False
    allow_remote_control: bool = False
    cloud_recording: bool = True
    recording_transcription: bool = False
    desktop_notifications: bool = True
    meeting_reminders: bool = True
    accessibility_captions: bool = False
    reduce_motion: bool = False
    keyboard_shortcuts: bool = True


class UserSettingsOut(BaseModel):
    """Per-user settings returned by the settings API."""

    settings: UserSettingsData


class UserSettingsUpdate(BaseModel):
    """Full replacement of a user's validated settings."""

    settings: UserSettingsData
