"""
Elimina tutti i player con id >= 27 e tutti i riferimenti a essi (FK a catena).

Esecuzione:
    $env:PYTHONPATH = "."
    python app/Scripts/cleanup_test_data.py
"""

from app.core.db import SessionLocal
from app.models import (
    Player,
    User,
    Tournament,
    TournamentPlayer,
    PlayoffHistory,
    Race,
    Result,
    SchedinaTorneo,
    SchedinaTorneoGroupStage,
    PremioTorneo,
    Notification,
    UserInventory,
    Prediction,
    Challenge,
    AuditLog,
    TempPassword,
    TournamentPhoto,
    PhotoComment,
)


def main():
    db = SessionLocal()
    try:
        print("=== CLEANUP TEST DATA (player id >= 27) ===")

        # 1. Trova player con id >= 27 e user collegati
        test_players = db.query(Player).filter(Player.id >= 27).all()
        test_player_ids = [p.id for p in test_players]
        if not test_player_ids:
            print("Nessun player con id >= 27 trovato.")
            return

        test_users = db.query(User).filter(User.player_id.in_(test_player_ids)).all()
        test_user_ids = [u.id for u in test_users]

        print(f"Player da eliminare (id >= 27): {test_player_ids}")
        print(f"User collegati: {test_user_ids}")

        # 2. Trova tornei di test: tornei con partecipanti test
        tp_rows = (
            db.query(TournamentPlayer.tournament_id)
            .filter(TournamentPlayer.player_id.in_(test_player_ids))
            .distinct()
            .all()
        )
        test_tournament_ids = list({row[0] for row in tp_rows})

        winner_rows = (
            db.query(Tournament.id)
            .filter(Tournament.winner_id.in_(test_player_ids))
            .distinct()
            .all()
        )
        test_tournament_ids = list(
            set(test_tournament_ids) | {row[0] for row in winner_rows}
        )

        # Escludi torneo id=92 (usa player reali)
        test_tournament_ids = [tid for tid in test_tournament_ids if tid != 92]

        if not test_tournament_ids:
            print("Nessun torneo di test trovato.")
            return

        print(f"Tornei di test: {sorted(test_tournament_ids)}")

        # Race IDs dei tornei di test
        race_rows = (
            db.query(Race.id).filter(Race.tournament_id.in_(test_tournament_ids)).all()
        )
        race_ids = [row[0] for row in race_rows]
        print(f"Gare da eliminare: {len(race_ids)}")

        # ================================================================
        # 3. NULLA le FK verso player/user nei tornei che NON vengono eliminati
        # ================================================================
        other_tournaments = (
            db.query(Tournament)
            .filter(
                ~Tournament.id.in_(test_tournament_ids),
                (
                    Tournament.winner_id.in_(test_player_ids)
                    | Tournament.duello_player_a_id.in_(test_player_ids)
                    | Tournament.duello_player_b_id.in_(test_player_ids)
                    | Tournament.consolation_winner_id.in_(test_player_ids)
                    | Tournament.vincitore_schedina_id.in_(test_user_ids)
                    | Tournament.created_by_id.in_(test_user_ids)
                    | Tournament.last_phase_change_by_id.in_(test_user_ids)
                ),
            )
            .all()
        )
        for t in other_tournaments:
            if t.winner_id in test_player_ids:
                t.winner_id = None
            if t.duello_player_a_id in test_player_ids:
                t.duello_player_a_id = None
            if t.duello_player_b_id in test_player_ids:
                t.duello_player_b_id = None
            if t.consolation_winner_id in test_player_ids:
                t.consolation_winner_id = None
            if t.vincitore_schedina_id in test_user_ids:
                t.vincitore_schedina_id = None
            if t.created_by_id in test_user_ids:
                t.created_by_id = None
            if t.last_phase_change_by_id in test_user_ids:
                t.last_phase_change_by_id = None
        db.flush()
        if other_tournaments:
            print(f"FK nullate su {len(other_tournaments)} tornei non di test")

        # ================================================================
        # 4. Elimina in ordine di dipendenza
        # ================================================================

        # UserInventory
        n = (
            db.query(UserInventory)
            .filter(UserInventory.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(UserInventory)
            .filter(UserInventory.source_tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(UserInventory)
            .filter(UserInventory.granted_by_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        print(f"  UserInventory eliminate: {n}")

        # PremioTorneo
        n = (
            db.query(PremioTorneo)
            .filter(PremioTorneo.torneo_sorgente_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(PremioTorneo)
            .filter(PremioTorneo.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        print(f"  PremioTorneo eliminate: {n}")

        # SchedinaTorneo
        n = (
            db.query(SchedinaTorneo)
            .filter(SchedinaTorneo.tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  SchedinaTorneo eliminate: {n}")

        # SchedinaTorneoGroupStage
        n = (
            db.query(SchedinaTorneoGroupStage)
            .filter(SchedinaTorneoGroupStage.tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  SchedinaTorneoGroupStage eliminate: {n}")

        # Prediction
        n = (
            db.query(Prediction)
            .filter(Prediction.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(Prediction)
            .filter(Prediction.predicted_player_id.in_(test_player_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(Prediction)
            .filter(Prediction.actual_winner_id.in_(test_player_ids))
            .delete(synchronize_session=False)
        )
        if n:
            print(f"  Prediction eliminate: {n}")

        # Notification
        n = (
            db.query(Notification)
            .filter(Notification.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(Notification)
            .filter(Notification.source_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(Notification)
            .filter(Notification.source_tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  Notification eliminate: {n}")

        # Challenge
        n = (
            db.query(Challenge)
            .filter(Challenge.sender_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(Challenge)
            .filter(Challenge.receiver_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        if n:
            print(f"  Challenge eliminate: {n}")

        # TempPassword
        n = (
            db.query(TempPassword)
            .filter(TempPassword.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        if n:
            print(f"  TempPassword eliminate: {n}")

        # AuditLog
        n = (
            db.query(AuditLog)
            .filter(AuditLog.actor_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        if n:
            print(f"  AuditLog eliminate: {n}")

        # TournamentPhoto → PhotoComment
        photo_ids = [
            r[0]
            for r in (
                db.query(TournamentPhoto.id)
                .filter(TournamentPhoto.uploaded_by_user_id.in_(test_user_ids))
                .all()
            )
        ]
        if photo_ids:
            db.query(PhotoComment).filter(PhotoComment.photo_id.in_(photo_ids)).delete(
                synchronize_session=False
            )
        n = (
            db.query(PhotoComment)
            .filter(PhotoComment.user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        n += (
            db.query(PhotoComment)
            .filter(PhotoComment.edited_by_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        if photo_ids:
            db.query(TournamentPhoto).filter(TournamentPhoto.id.in_(photo_ids)).delete(
                synchronize_session=False
            )
        n_photo = (
            db.query(TournamentPhoto)
            .filter(TournamentPhoto.uploaded_by_user_id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        if n or n_photo:
            print(f"  PhotoComment/TournamentPhoto eliminate: {n + n_photo}")

        # PlayoffHistory
        n = (
            db.query(PlayoffHistory)
            .filter(PlayoffHistory.tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  PlayoffHistory eliminate: {n}")

        # Result
        if race_ids:
            n = (
                db.query(Result)
                .filter(Result.race_id.in_(race_ids))
                .delete(synchronize_session=False)
            )
            print(f"  Result eliminate: {n}")

            # Race
            n = (
                db.query(Race)
                .filter(Race.tournament_id.in_(test_tournament_ids))
                .delete(synchronize_session=False)
            )
            print(f"  Race eliminate: {n}")

        # TournamentPlayer
        n = (
            db.query(TournamentPlayer)
            .filter(TournamentPlayer.tournament_id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  TournamentPlayer eliminate: {n}")

        # Tournament
        n = (
            db.query(Tournament)
            .filter(Tournament.id.in_(test_tournament_ids))
            .delete(synchronize_session=False)
        )
        print(f"  Tournament eliminate: {n}")

        # User
        n = (
            db.query(User)
            .filter(User.id.in_(test_user_ids))
            .delete(synchronize_session=False)
        )
        print(f"  User eliminate: {n}")

        # Player
        n = (
            db.query(Player)
            .filter(Player.id.in_(test_player_ids))
            .delete(synchronize_session=False)
        )
        print(f"  Player eliminate: {n}")

        db.commit()
        print("\n=== CLEANUP COMPLETATO ===")

    except Exception as e:
        db.rollback()
        print(f"\nERRORE: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
