"""
One-shot cleanup script: find and remove/nullify all orphan rows in the database
that reference tournaments (or other entities) that no longer exist.

This handles the case where tournaments were deleted BEFORE the proper
cascade logic was implemented in tournament_delete().

Run from project root:  python scripts/cleanup_orphan_data.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.db import SessionLocal
from app.models import (
    Notification,
    PlayoffHistory,
    Prediction,
    SchedinaTorneo,
    SchedinaTorneoGroupStage,
    PremioTorneo,
    TournamentPhoto,
    UserInventory,
    TournamentPlayer,
    Race,
    Tournament,
)


def collect_ids(db, model, id_column="id"):
    return {r[0] for r in db.query(getattr(model, id_column)).all()}


def main():
    db = SessionLocal()
    try:
        existing_tournament_ids = collect_ids(db, Tournament)
        existing_schedina_ids = collect_ids(db, SchedinaTorneo)
        existing_race_ids = collect_ids(db, Race)

        summary = {}

        # 1. UserInventory unconsumed → DELETE where source_tournament_id not in existing tournaments
        orphan_inv_unconsumed = (
            db.query(UserInventory)
            .filter(
                UserInventory.source_tournament_id.isnot(None),
                UserInventory.source_tournament_id.notin_(existing_tournament_ids),
                UserInventory.is_consumed == False,
            )
            .all()
        )
        summary["user_inventory (unconsumed, DELETE)"] = len(orphan_inv_unconsumed)
        for row in orphan_inv_unconsumed:
            db.delete(row)

        # 2. UserInventory consumed → NULLIFY source_tournament_id where not in existing tournaments
        n_inv_consumed_null = (
            db.query(UserInventory)
            .filter(
                UserInventory.source_tournament_id.isnot(None),
                UserInventory.source_tournament_id.notin_(existing_tournament_ids),
                UserInventory.is_consumed == True,
            )
            .update(
                {UserInventory.source_tournament_id: None}, synchronize_session=False
            )
        )
        summary["user_inventory (consumed, NULLified)"] = n_inv_consumed_null

        # 3. UserInventory.source_schedina_id → NULLIFY where schedina doesn't exist
        n_inv_schedina_null = (
            db.query(UserInventory)
            .filter(
                UserInventory.source_schedina_id.isnot(None),
                UserInventory.source_schedina_id.notin_(existing_schedina_ids),
            )
            .update({UserInventory.source_schedina_id: None}, synchronize_session=False)
        )
        summary["user_inventory (source_schedina_id NULLified)"] = n_inv_schedina_null

        # 4. UserInventory.consumed_in_race_id → NULLIFY where race doesn't exist
        n_inv_race_null = (
            db.query(UserInventory)
            .filter(
                UserInventory.consumed_in_race_id.isnot(None),
                UserInventory.consumed_in_race_id.notin_(existing_race_ids),
            )
            .update(
                {UserInventory.consumed_in_race_id: None}, synchronize_session=False
            )
        )
        summary["user_inventory (consumed_in_race_id NULLified)"] = n_inv_race_null

        # 5. SchedinaTorneo → DELETE where tournament_id not in existing tournaments
        orphan_schedine = (
            db.query(SchedinaTorneo)
            .filter(
                SchedinaTorneo.tournament_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["schedine_torneo (DELETE)"] = len(orphan_schedine)
        for row in orphan_schedine:
            db.delete(row)

        # 5b. SchedinaTorneoGroupStage → DELETE where tournament_id not in existing tournaments
        orphan_schedine_deluxe = (
            db.query(SchedinaTorneoGroupStage)
            .filter(
                SchedinaTorneoGroupStage.tournament_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["schedine_torneo_deluxe (DELETE)"] = len(orphan_schedine_deluxe)
        for row in orphan_schedine_deluxe:
            db.delete(row)

        # 5c. Notification.source_tournament_id → NULLIFY where tournament doesn't exist
        n_notifications_null = (
            db.query(Notification)
            .filter(
                Notification.source_tournament_id.isnot(None),
                Notification.source_tournament_id.notin_(existing_tournament_ids),
            )
            .update(
                {Notification.source_tournament_id: None}, synchronize_session=False
            )
        )
        summary["notifications (source_tournament_id NULLified)"] = n_notifications_null

        # 5d. TournamentPhoto.tournament_id → NULLIFY where tournament doesn't exist
        n_photos_null = (
            db.query(TournamentPhoto)
            .filter(
                TournamentPhoto.tournament_id.isnot(None),
                TournamentPhoto.tournament_id.notin_(existing_tournament_ids),
            )
            .update({TournamentPhoto.tournament_id: None}, synchronize_session=False)
        )
        summary["tournament_photos (tournament_id NULLified)"] = n_photos_null

        # 6. PremioTorneo → DELETE where torneo_sorgente_id not in existing tournaments
        orphan_premi_src = (
            db.query(PremioTorneo)
            .filter(
                PremioTorneo.torneo_sorgente_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["premi_torneo (sorgente DELETE)"] = len(orphan_premi_src)
        for row in orphan_premi_src:
            db.delete(row)

        # 7. PremioTorneo → NULLIFY torneo_id_prossimo where not in existing tournaments
        n_premi_prossimo_null = (
            db.query(PremioTorneo)
            .filter(
                PremioTorneo.torneo_id_prossimo.isnot(None),
                PremioTorneo.torneo_id_prossimo.notin_(existing_tournament_ids),
            )
            .update({PremioTorneo.torneo_id_prossimo: None}, synchronize_session=False)
        )
        summary["premi_torneo (prossimo NULLified)"] = n_premi_prossimo_null

        # 8. Prediction → DELETE where tournament_id not in existing tournaments
        orphan_predictions = (
            db.query(Prediction)
            .filter(
                Prediction.tournament_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["predictions (DELETE)"] = len(orphan_predictions)
        for row in orphan_predictions:
            db.delete(row)

        # 9. PlayoffHistory → DELETE where tournament_id not in existing tournaments
        orphan_playoff = (
            db.query(PlayoffHistory)
            .filter(
                PlayoffHistory.tournament_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["playoff_history (DELETE)"] = len(orphan_playoff)
        for row in orphan_playoff:
            db.delete(row)

        # 10. TournamentPlayer → DELETE where tournament_id not in existing tournaments
        orphan_tp = (
            db.query(TournamentPlayer)
            .filter(
                TournamentPlayer.tournament_id.notin_(existing_tournament_ids),
            )
            .all()
        )
        summary["tournament_players (DELETE)"] = len(orphan_tp)
        for row in orphan_tp:
            db.delete(row)

        db.commit()

        print("=== Orphan data cleanup complete ===")
        for key, count in summary.items():
            print(f"  {key}: {count}")
        print(f"\nTotal orphan rows affected: {sum(summary.values())}")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
