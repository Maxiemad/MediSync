"""MedSync backend - drug interaction checker."""

from .interaction_checker import check_drug_interactions, load_interaction_data

__all__ = ["check_drug_interactions", "load_interaction_data"]
