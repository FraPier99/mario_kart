from sqlalchemy import Column, Integer, String, Text, ForeignKey, Date, UniqueConstraint,CheckConstraint
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

# -------------------
# PLAYER
# -------------------
class Player(Base):
    __tablename__ = 'players'

    id = Column(Integer, primary_key=True,autoincrement=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    nickname = Column(String, nullable=False,unique=True)
    img_url = Column(Text, nullable=True)


    favorite_character_id = Column(Integer, ForeignKey('characters.id'), nullable=True)

    results = relationship('Result', back_populates='player')
    favorite_character = relationship('Character',back_populates='fans')
    wins = relationship('Tournament', back_populates='winner', foreign_keys='Tournament.winner_id')
    tournament_links = relationship('TournamentPlayer', back_populates='player')
    __table_args__ = (
        UniqueConstraint('nickname', name='unique_player_nickname'),
    )
    # wins = relationship('HallOfFame', back_populates='player')



# -------------------
# GAME
# -------------------
class Game(Base):
    __tablename__ = 'games'

    id = Column(Integer, primary_key=True,autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String)

    characters = relationship('Character', back_populates='game')
    tournaments = relationship('Tournament', back_populates='game')
    circuits = relationship('Circuit', back_populates='game')


# -------------------
# CHARACTER
# -------------------
class Character(Base):
    __tablename__ = 'characters'

    id = Column(Integer, primary_key=True,autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String)
    img_url = Column(Text, nullable=True)

    game_id = Column(Integer, ForeignKey('games.id'), nullable=False)

    game = relationship('Game', back_populates='characters')
    results = relationship('Result', back_populates='character')
    fans = relationship('Player', back_populates='favorite_character')
    __table_args__ = (
        UniqueConstraint('name', 'game_id', name='unique_character_per_game'),
    )


# -------------------
# CIRCUIT
# -------------------
class Circuit(Base):
    __tablename__ = 'circuits'

    id = Column(Integer, primary_key=True,autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String)
    game_id = Column(Integer, ForeignKey('games.id'), nullable=False)
    game  = relationship('Game', back_populates='circuits')
    races = relationship('Race', back_populates='circuit')
    __table_args__ = (
        UniqueConstraint('name', 'game_id', name='unique_circuit_name_per_game'),)


# -------------------
# TOURNAMENT
# -------------------
class Tournament(Base):
    __tablename__ = 'tournaments'

    id = Column(Integer,primary_key=True,autoincrement=True)
    name = Column(String,nullable=False)
    date = Column(Date)

    game_id = Column(Integer, ForeignKey('games.id'), nullable=False)
    

    n_races  = Column(Integer, nullable=False)
    n_players = Column(Integer, nullable=False)

    winner_id = Column(Integer, ForeignKey('players.id'), nullable=True)

    game = relationship('Game', back_populates='tournaments')
    races = relationship('Race', back_populates='tournament')
    winner = relationship('Player', back_populates='wins',foreign_keys=[winner_id])
    player_links = relationship('TournamentPlayer', back_populates='tournament')
    __table_args__ = (UniqueConstraint('name', 'date', name='unique_tournament_name_date'),)





# -------------------
# TOURNAMENT PLAYER (many-to-many)
# -------------------
class TournamentPlayer(Base):
    __tablename__ = 'tournament_players'

    tournament_id = Column(Integer, ForeignKey('tournaments.id'), primary_key=True)
    player_id = Column(Integer, ForeignKey('players.id'), primary_key=True)

    tournament = relationship('Tournament', back_populates='player_links')
    player = relationship('Player', back_populates='tournament_links')


# -------------------
# RACE
# -------------------
class Race(Base):
    __tablename__ = 'races'

    id = Column(Integer, primary_key=True,autoincrement=True)
    name = Column(String)
    race_order = Column(Integer, nullable=False)

    tournament_id = Column(Integer, ForeignKey('tournaments.id'), nullable=False)
    circuit_id = Column(Integer, ForeignKey('circuits.id'), nullable=False)

    tournament = relationship('Tournament', back_populates='races')
    circuit = relationship('Circuit', back_populates='races')
    results = relationship('Result', back_populates='race')


# -------------------
# RESULT
# -------------------
class Result(Base):
    __tablename__ = 'results'

    id = Column(Integer,primary_key=True,autoincrement=True)

    race_id = Column(Integer, ForeignKey('races.id'), nullable=False)
    player_id = Column(Integer, ForeignKey('players.id'), nullable=False)
    character_id = Column(Integer, ForeignKey('characters.id'), nullable=False)

    position = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)

    race = relationship('Race', back_populates='results')
    player = relationship('Player', back_populates='results')
    character = relationship('Character', back_populates='results')

    __table_args__ = (
        UniqueConstraint('race_id', 'player_id', name='unique_player_per_race'),
        UniqueConstraint('race_id','position', name='unique_position_per_race'),
        CheckConstraint('position > 0', name='check_position_positive'),
        CheckConstraint('points >= 0', name='check_points_non_negative'),
    )


# -------------------
# HALL OF FAME
# -------------------
# class HallOfFame(Base):
#     __tablename__ = 'hall_of_fame'

#     id = Column(Integer, primary_key=True,autoincrement=True)

#     tournament_id = Column(Integer, ForeignKey('tournaments.id'), nullable=False)
#     player_id = Column(Integer, ForeignKey('players.id'), nullable=False)

#     tournament = relationship('Tournament', back_populates='hall_of_fame')
#     player = relationship('Player', back_populates='wins')

#     __table_args__ = (
#         UniqueConstraint('tournament_id', 'player_id', name='unique_tournament_winner'),
#     )