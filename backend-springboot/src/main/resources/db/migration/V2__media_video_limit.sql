CREATE UNIQUE INDEX uk_media_single_video_per_property
    ON media (property_id)
    WHERE media_type IN ('VIDEO_LINK', 'VIDEO_FILE');
