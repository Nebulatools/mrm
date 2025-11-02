from __future__ import annotations

import inspect
from typing import Any

from sklearn.preprocessing import OneHotEncoder


def build_one_hot_encoder(**overrides: Any) -> OneHotEncoder:
    """
    Construct a OneHotEncoder compatible with both old and new sklearn versions.

    sklearn <=1.1 expects ``sparse`` while >=1.2 renamed the parameter to
    ``sparse_output``. This helper inspects the signature at runtime and sets the
    appropriate argument, allowing the rest of the codebase to request a dense
    matrix without knowing which version is installed.
    """
    kwargs: dict[str, Any] = {'handle_unknown': 'ignore'}
    signature = inspect.signature(OneHotEncoder)
    if 'sparse_output' in signature.parameters:
        kwargs['sparse_output'] = False
    else:
        kwargs['sparse'] = False
    kwargs.update(overrides)
    return OneHotEncoder(**kwargs)
