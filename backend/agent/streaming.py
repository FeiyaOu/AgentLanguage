"""Extract complete JSON objects without assuming model chunk boundaries."""
import json


def question_objects(chunks):
    depth = 0
    quoted = False
    escaped = False
    buffer = []
    for chunk in chunks:
        for char in chunk:
            if depth == 0:
                if char != '{':
                    continue
                buffer = []
            buffer.append(char)
            if quoted:
                if escaped:
                    escaped = False
                elif char == '\\':
                    escaped = True
                elif char == '"':
                    quoted = False
            elif char == '"':
                quoted = True
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    yield json.loads(''.join(buffer))
            if len(buffer) > 100_000:
                raise ValueError('Generated question exceeds size limit')
    if depth:
        raise ValueError('Incomplete generated question')
