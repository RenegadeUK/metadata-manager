def normalize_path_prefix(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        return "/"

    parts = [part for part in cleaned.replace("\\", "/").split("/") if part]
    normalized = "/" + "/".join(parts)
    return "/" if normalized == "" else normalized


def translate_path_prefix(
    *,
    source_path_prefix: str,
    target_path_prefix: str,
    file_path: str,
) -> tuple[bool, str | None, str]:
    normalized_source = normalize_path_prefix(source_path_prefix)
    normalized_target = normalize_path_prefix(target_path_prefix)
    normalized_file_path = normalize_path_prefix(file_path)

    if normalized_file_path == normalized_source:
        return True, normalized_target, "Path translated"

    source_prefix = normalized_source.rstrip("/") + "/"
    if not normalized_file_path.startswith(source_prefix):
        return False, None, "File path is outside the folder mapping source path"

    suffix = normalized_file_path[len(normalized_source):]
    translated = normalized_target + suffix
    return True, translated, "Path translated"
