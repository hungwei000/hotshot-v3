--
-- PostgreSQL database dump
--

\restrict Ly6gxnLD8ls951UfQr6VN6dH2WmthL0dCCCPJjA3uKUAQWchziz325iXBf6oOEj

-- Dumped from database version 16.13 (Homebrew)
-- Dumped by pg_dump version 16.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: sports; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sports VALUES ('nba', 'NBA');
INSERT INTO public.sports VALUES ('nhl', 'NHL');
INSERT INTO public.sports VALUES ('mlb', 'MLB');


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.teams VALUES ('hou-nba', 'nba', 'Houston Rockets', 'Rockets', 'HOU');
INSERT INTO public.teams VALUES ('pit-nhl', 'nhl', 'Pittsburgh Penguins', 'Penguins', 'PIT');
INSERT INTO public.teams VALUES ('pit-mlb', 'mlb', 'Pittsburgh Pirates', 'Pirates', 'PIT');
INSERT INTO public.teams VALUES ('lal', 'nba', 'Los Angeles Lakers', 'Lakers', 'LAL');
INSERT INTO public.teams VALUES ('phx', 'nba', 'Phoenix Suns', 'Suns', 'PHX');
INSERT INTO public.teams VALUES ('okc', 'nba', 'Oklahoma City Thunder', 'Thunder', 'OKC');
INSERT INTO public.teams VALUES ('bos-nba', 'nba', 'Boston Celtics', 'Celtics', 'BOS');
INSERT INTO public.teams VALUES ('phi-nba', 'nba', 'Philadelphia 76ers', '76ers', 'PHI');
INSERT INTO public.teams VALUES ('min-nba', 'nba', 'Minnesota Timberwolves', 'Wolves', 'MIN');
INSERT INTO public.teams VALUES ('sas', 'nba', 'San Antonio Spurs', 'Spurs', 'SAS');
INSERT INTO public.teams VALUES ('nyk', 'nba', 'New York Knicks', 'Knicks', 'NYK');
INSERT INTO public.teams VALUES ('det', 'nba', 'Detroit Pistons', 'Pistons', 'DET');
INSERT INTO public.teams VALUES ('cle', 'nba', 'Cleveland Cavaliers', 'Cavaliers', 'CLE');
INSERT INTO public.teams VALUES ('car', 'nhl', 'Carolina Hurricanes', 'Hurricanes', 'CAR');
INSERT INTO public.teams VALUES ('ana', 'nhl', 'Anaheim Ducks', 'Ducks', 'ANA');
INSERT INTO public.teams VALUES ('vgk', 'nhl', 'Vegas Golden Knights', 'Golden Knights', 'VGK');
INSERT INTO public.teams VALUES ('mtl', 'nhl', 'Montreal Canadiens', 'Canadiens', 'MTL');
INSERT INTO public.teams VALUES ('col', 'nhl', 'Colorado Avalanche', 'Avalanche', 'COL');
INSERT INTO public.teams VALUES ('min-nhl', 'nhl', 'Minnesota Wild', 'Wild', 'MIN');
INSERT INTO public.teams VALUES ('bos-nhl', 'nhl', 'Boston Bruins', 'Bruins', 'BOS');
INSERT INTO public.teams VALUES ('buf', 'nhl', 'Buffalo Sabres', 'Sabres', 'BUF');
INSERT INTO public.teams VALUES ('phi-nhl', 'nhl', 'Philadelphia Flyers', 'Flyers', 'PHI');
INSERT INTO public.teams VALUES ('atl', 'mlb', 'Atlanta Braves', 'Braves', 'ATL');
INSERT INTO public.teams VALUES ('sea', 'mlb', 'Seattle Mariners', 'Mariners', 'SEA');
INSERT INTO public.teams VALUES ('lad', 'mlb', 'Los Angeles Dodgers', 'Dodgers', 'LAD');
INSERT INTO public.teams VALUES ('nyy', 'mlb', 'New York Yankees', 'Yankees', 'NYY');
INSERT INTO public.teams VALUES ('bal', 'mlb', 'Baltimore Orioles', 'Orioles', 'BAL');
INSERT INTO public.teams VALUES ('hou-mlb', 'mlb', 'Houston Astros', 'Astros', 'HOU');
INSERT INTO public.teams VALUES ('tex', 'mlb', 'Texas Rangers', 'Rangers', 'TEX');
INSERT INTO public.teams VALUES ('sd', 'mlb', 'San Diego Padres', 'Padres', 'SD');
INSERT INTO public.teams VALUES ('chc', 'mlb', 'Chicago Cubs', 'Cubs', 'CHC');
INSERT INTO public.teams VALUES ('phi-mlb', 'mlb', 'Philadelphia Phillies', 'Phillies', 'PHI');
INSERT INTO public.teams VALUES ('sf', 'mlb', 'San Francisco Giants', 'Giants', 'SF');
INSERT INTO public.teams VALUES ('mia-mlb', 'mlb', 'Miami Marlins', 'Marlins', 'MIA');
INSERT INTO public.teams VALUES ('cle-mlb', 'mlb', 'Cleveland Guardians', 'Guardians', 'CLE');
INSERT INTO public.teams VALUES ('tb', 'mlb', 'Tampa Bay Rays', 'Rays', 'TB');
INSERT INTO public.teams VALUES ('tor-mlb', 'mlb', 'Toronto Blue Jays', 'Blue Jays', 'TOR');
INSERT INTO public.teams VALUES ('bos-mlb', 'mlb', 'Boston Red Sox', 'Red Sox', 'BOS');
INSERT INTO public.teams VALUES ('min-mlb', 'mlb', 'Minnesota Twins', 'Twins', 'MIN');


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.games VALUES ('nba-nyk-phi-g2', 'nba', 'phi-nba', 'nyk', '2026-05-07 18:30:00-05', 'upcoming', -125, 105, 217.5, 'Game 2 shifts pressure onto the road side', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-mia-lad-427', 'mlb', 'lad', 'mia-mlb', '2026-04-27 21:10:00-05', 'final', -255, 210, 8.5, 'Dodgers past market is resolved', 'lad', 8, 2, NULL, false);
INSERT INTO public.games VALUES ('mlb-hou-bal-428', 'mlb', 'bal', 'hou-mlb', '2026-04-28 17:35:00-05', 'final', -115, -105, 8.5, 'Orioles/Astros past market is resolved', 'bal', 5, 4, NULL, false);
INSERT INTO public.games VALUES ('mlb-sf-phi-428', 'mlb', 'phi-mlb', 'sf', '2026-04-28 17:40:00-05', 'final', -140, 120, 8.0, 'Phillies past market is resolved', 'phi-mlb', 7, 3, NULL, false);
INSERT INTO public.games VALUES ('mlb-sea-min-428', 'mlb', 'min-mlb', 'sea', '2026-04-28 18:40:00-05', 'final', -110, -110, 7.5, 'Mariners past market is resolved', 'sea', 2, 4, NULL, false);
INSERT INTO public.games VALUES ('mlb-tex-nyy-505', 'mlb', 'nyy', 'tex', '2026-05-05 18:05:00-05', 'upcoming', -118, 100, 8.5, 'Yankees begin a series with Texas Odds synced from The Odds API.', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-phi-car-g2', 'nhl', 'car', 'phi-nhl', '2026-05-04 18:00:00-05', 'live', -180, 140, 5.5, 'Carolina leads the second-round series 1-0 Odds synced from The Odds API.', NULL, 2, 2, 'Live', false);
INSERT INTO public.games VALUES ('mlb-mia-sf-426', 'mlb', 'sf', 'mia-mlb', '2026-04-26 15:05:00-05', 'final', -155, 135, 8.0, 'Past MLB market already settled', 'sf', 5, 3, NULL, false);
INSERT INTO public.games VALUES ('nhl-vgk-ana-g3', 'nhl', 'ana', 'vgk', '2026-05-08 20:30:00-05', 'upcoming', 100, -120, 6.0, 'Ducks host Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-atl-lad-508', 'mlb', 'lad', 'atl', '2026-05-08 21:10:00-05', 'upcoming', -155, 135, 8.5, 'Braves open a road series at Dodger Stadium', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-bos-tor-427', 'mlb', 'tor-mlb', 'bos-mlb', '2026-04-27 18:07:00-05', 'final', -135, 115, 8.5, 'Resolved Blue Jays home market', 'tor-mlb', 3, 1, NULL, false);
INSERT INTO public.games VALUES ('nba-det-cle-g3', 'nba', 'cle', 'det', '2026-05-09 19:30:00-05', 'upcoming', -170, 145, 214.5, 'Cavaliers host Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-phi-nyk-g3', 'nba', 'nyk', 'phi-nba', '2026-05-09 18:00:00-05', 'upcoming', -135, 115, 216.5, 'Knicks home crowd gets Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-min-sas-g2', 'nba', 'sas', 'min-nba', '2026-05-06 19:00:00-05', 'upcoming', -140, 120, 220.5, 'Spurs try to protect home court in Game 2', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nba-okc-lal-g4', 'nba', 'lal', 'okc', '2026-05-10 18:30:00-05', 'upcoming', 120, -140, 225.5, 'Game 4 stays visible but is locked until closer to tip', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-sas-min-g4', 'nba', 'min-nba', 'sas', '2026-05-10 20:00:00-05', 'upcoming', -130, 110, 220.5, 'Game 4 in Minnesota stays locked until closer to tip', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-nyk-phi-g4', 'nba', 'phi-nba', 'nyk', '2026-05-11 18:30:00-05', 'upcoming', -125, 105, 217.5, 'Game 4 stays visible but is locked until closer to tip', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-cle-det-g4', 'nba', 'det', 'cle', '2026-05-11 20:00:00-05', 'upcoming', -105, -115, 215.5, 'Game 4 stays visible but is locked until closer to tip', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-bos-buf-g6', 'nhl', 'buf', 'bos-nhl', '2026-05-01 18:30:00-05', 'final', -170, 145, 5.5, 'Buffalo eliminated Boston in six games', 'buf', 4, 1, NULL, false);
INSERT INTO public.games VALUES ('nhl-phi-car-g1', 'nhl', 'car', 'phi-nhl', '2026-05-03 18:00:00-05', 'final', -180, 155, 5.5, 'Hurricanes took Game 1 at home', 'car', 4, 2, NULL, false);
INSERT INTO public.games VALUES ('mlb-bal-nyy-504', 'mlb', 'nyy', 'bal', '2026-05-04 18:05:00-05', 'final', -155, 135, 8.5, 'Adjusted from The Odds API final score.', 'nyy', 11, 3, NULL, false);
INSERT INTO public.games VALUES ('nba-lal-okc-g2', 'nba', 'okc', 'lal', '2026-05-06 20:30:00-05', 'upcoming', -1050, 675, 225.5, 'Thunder host Game 2 in Oklahoma City Odds synced from The Odds API.', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nba-phx-okc-g4', 'nba', 'okc', 'phx', '2026-04-29 20:30:00-05', 'final', -220, 185, 226.5, 'The Suns have been eliminated from playoffs.', 'okc', 118, 101, NULL, false);
INSERT INTO public.games VALUES ('nba-bos-phi-g7', 'nba', 'phi-nba', 'bos-nba', '2026-05-03 18:30:00-05', 'final', -115, -105, 216.5, 'The Celtics have been eliminated from the playoffs.', 'phi-nba', 111, 104, NULL, false);
INSERT INTO public.games VALUES ('nba-min-sas-g1', 'nba', 'sas', 'min-nba', '2026-05-04 20:30:00-05', 'live', -375, 270, 221.5, 'Western Conference Semifinals Game 1 Odds synced from The Odds API.', NULL, 29, 29, 'Live', false);
INSERT INTO public.games VALUES ('mlb-chc-lad-426', 'mlb', 'lad', 'chc', '2026-04-26 15:10:00-05', 'final', -175, 150, 8.5, 'Dodgers home market is resolved', 'lad', 6, 4, NULL, false);
INSERT INTO public.games VALUES ('mlb-lad-hou-505', 'mlb', 'hou-mlb', 'lad', '2026-05-05 19:10:00-05', 'live', 172, -205, 8.0, 'Dodgers and Astros continue the set Odds synced from The Odds API.', NULL, 3, 8, 'Live', false);
INSERT INTO public.games VALUES ('mlb-sd-bal-505', 'mlb', 'bal', 'sd', '2026-05-05 18:35:00-05', 'upcoming', -115, -105, 8.0, 'Padres/Orioles matchup for the live board', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-chc-phi-506', 'mlb', 'phi-mlb', 'chc', '2026-05-06 18:40:00-05', 'upcoming', -135, 115, 8.0, 'Cubs visit the Phillies for a featured slate matchup', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-nyy-tex-427', 'mlb', 'tex', 'nyy', '2026-04-27 19:05:00-05', 'final', -105, -115, 8.5, 'Yankees past market is resolved', 'nyy', 4, 5, NULL, false);
INSERT INTO public.games VALUES ('mlb-chc-sd-427', 'mlb', 'sd', 'chc', '2026-04-27 20:40:00-05', 'final', -130, 110, 8.0, 'Padres past market is resolved', 'sd', 6, 3, NULL, false);
INSERT INTO public.games VALUES ('nba-okc-lal-g3', 'nba', 'lal', 'okc', '2026-05-08 19:30:00-05', 'upcoming', 125, -145, 224.5, 'Game 3 shifts to Los Angeles; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-atl-sea-506', 'mlb', 'sea', 'atl', '2026-05-06 15:10:00-05', 'upcoming', 105, -125, 8.0, 'Braves wrap the Seattle series', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-phi-sd-508', 'mlb', 'sd', 'phi-mlb', '2026-05-08 20:40:00-05', 'upcoming', -125, 105, 8.0, 'Padres host the Phillies later in the week', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nba-cle-det-g2', 'nba', 'det', 'cle', '2026-05-07 20:00:00-05', 'upcoming', -105, -115, 215.5, 'Pistons host a second-round playoff game', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-tb-cle-427', 'mlb', 'cle-mlb', 'tb', '2026-04-27 17:10:00-05', 'final', -125, 105, 8.0, 'Resolved Rays/Guardians market', 'tb', 1, 2, NULL, false);
INSERT INTO public.games VALUES ('nba-sas-min-g3', 'nba', 'min-nba', 'sas', '2026-05-08 20:30:00-05', 'upcoming', -125, 105, 221.5, 'Timberwolves host Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-atl-sea-501', 'mlb', 'sea', 'atl', '2026-05-01 20:40:00-05', 'final', -105, -115, 8.0, 'Braves past market is resolved', 'atl', 4, 6, NULL, false);
INSERT INTO public.games VALUES ('nhl-ana-vgk-g1', 'nhl', 'vgk', 'ana', '2026-05-04 20:30:00-05', 'live', -180, 140, 6.0, 'Western Conference Second Round Game 1 Odds synced from The Odds API.', NULL, 0, 0, 'Live', false);
INSERT INTO public.games VALUES ('nba-det-cle-g1', 'nba', 'cle', 'det', '2026-05-05 19:30:00-05', 'upcoming', -160, 135, 214.5, 'Eastern Conference Semifinals Game 1', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-min-col-g2', 'nhl', 'col', 'min-nhl', '2026-05-05 20:30:00-05', 'upcoming', -215, 170, 5.5, 'Wild and Avalanche continue their second-round series Odds synced from The Odds API.', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-atl-sea-504', 'mlb', 'sea', 'atl', '2026-05-04 20:40:00-05', 'live', -154, 130, 7.5, 'Braves visit Seattle on Monday Odds synced from The Odds API.', NULL, 0, 1, 'Live', false);
INSERT INTO public.games VALUES ('nhl-mtl-buf-g1', 'nhl', 'buf', 'mtl', '2026-05-06 18:00:00-05', 'upcoming', -160, 135, 5.5, 'Eastern Conference Second Round Game 1 in Buffalo', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-car-phi-g3', 'nhl', 'phi-nhl', 'car', '2026-05-07 18:30:00-05', 'upcoming', 115, -135, 5.5, 'The series shifts to Philadelphia for Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-atl-sea-505', 'mlb', 'sea', 'atl', '2026-05-05 20:40:00-05', 'upcoming', -110, -110, 7.5, 'Braves continue the Mariners series', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-lad-hou-504', 'mlb', 'hou-mlb', 'lad', '2026-05-04 19:10:00-05', 'live', 166, -198, 8.5, 'Astros host the Dodgers in Houston Odds synced from The Odds API.', NULL, 3, 5, 'Top 7th', false);
INSERT INTO public.games VALUES ('mlb-chc-nyy-508', 'mlb', 'nyy', 'chc', '2026-05-08 18:05:00-05', 'upcoming', -170, 145, 8.5, 'Cubs/Yankees presentation matchup', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-min-col-g1', 'nhl', 'col', 'min-nhl', '2026-05-04 21:00:00-05', 'final', -175, 150, 5.5, 'Adjusted from The Odds API final score.', 'col', 9, 6, NULL, false);
INSERT INTO public.games VALUES ('nba-lal-okc-g1', 'nba', 'okc', 'lal', '2026-05-04 19:30:00-05', 'live', -180, 155, 224.5, 'Western Conference Semifinals Game 1', NULL, 66, 61, 'Q3 7:42', false);
INSERT INTO public.games VALUES ('nhl-ana-vgk-g2', 'nhl', 'vgk', 'ana', '2026-05-05 20:30:00-05', 'upcoming', -170, 145, 6.0, 'Golden Knights host Game 2', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-mtl-buf-g2', 'nhl', 'buf', 'mtl', '2026-05-06 20:00:00-05', 'upcoming', -165, 140, 5.5, 'Sabres host Game 2', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('nhl-col-min-g3', 'nhl', 'min-nhl', 'col', '2026-05-07 20:30:00-05', 'upcoming', 125, -145, 5.5, 'Wild host Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-buf-mtl-g3', 'nhl', 'mtl', 'buf', '2026-05-08 18:00:00-05', 'upcoming', 105, -125, 5.5, 'Canadiens host Game 3; betting opens after Game 2', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-car-phi-g4', 'nhl', 'phi-nhl', 'car', '2026-05-09 18:30:00-05', 'upcoming', 110, -130, 5.5, 'Flyers host Game 4, locked until closer to puck drop', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-col-min-g4', 'nhl', 'min-nhl', 'col', '2026-05-09 20:30:00-05', 'upcoming', 120, -140, 5.5, 'Wild host Game 4, locked until closer to puck drop', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-vgk-ana-g4', 'nhl', 'ana', 'vgk', '2026-05-10 20:30:00-05', 'upcoming', 105, -125, 6.0, 'Ducks host Game 4, locked until closer to puck drop', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nhl-buf-mtl-g4', 'nhl', 'mtl', 'buf', '2026-05-10 18:00:00-05', 'upcoming', 100, -120, 5.5, 'Canadiens host Game 4, locked until closer to puck drop', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-hou-bal-506', 'mlb', 'bal', 'hou-mlb', '2026-05-06 17:35:00-05', 'upcoming', -115, -105, 8.5, 'Astros and Orioles continue the series', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-nyy-tb-506', 'mlb', 'tb', 'nyy', '2026-05-06 17:50:00-05', 'upcoming', 105, -125, 8.0, 'Yankees visit Tampa Bay', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-sd-atl-507', 'mlb', 'atl', 'sd', '2026-05-07 18:20:00-05', 'upcoming', -145, 125, 8.5, 'Padres visit the Braves', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-sea-bos-507', 'mlb', 'bos-mlb', 'sea', '2026-05-07 18:10:00-05', 'upcoming', -115, -105, 8.5, 'Mariners and Red Sox on the expanded board', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-phi-chc-507', 'mlb', 'chc', 'phi-mlb', '2026-05-07 19:05:00-05', 'upcoming', 100, -120, 8.0, 'Phillies/Cubs return matchup', NULL, NULL, NULL, NULL, false);
INSERT INTO public.games VALUES ('mlb-cle-min-509', 'mlb', 'min-mlb', 'cle-mlb', '2026-05-09 18:40:00-05', 'upcoming', -125, 105, 7.5, 'Guardians/Twins scout-only matchup for later in the week', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-tor-tex-509', 'mlb', 'tex', 'tor-mlb', '2026-05-09 19:05:00-05', 'upcoming', -135, 115, 8.5, 'Blue Jays visit Texas, locked until the 3-day window', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('mlb-lad-sf-509', 'mlb', 'sf', 'lad', '2026-05-09 20:05:00-05', 'upcoming', 130, -150, 8.0, 'Dodgers/Giants rivalry game visible for scouting', NULL, NULL, NULL, NULL, true);
INSERT INTO public.games VALUES ('nba-phi-nyk-g1', 'nba', 'nyk', 'phi-nba', '2026-05-05 18:00:00-05', 'live', -290, 235, 216.5, 'Eastern Conference Semifinals Game 1 Odds synced from The Odds API.', NULL, 109, 78, 'Live', false);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES ('user-adbb38a768707731', 'lambun', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 0, 0, 1, '2026-05-04 16:42:25.140857-05', '2026-05-04 16:42:43.987011-05');
INSERT INTO public.users VALUES ('user-89a7b6a64ad96255', 'dreamshooter', 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', 18932, 2, 1, '2026-05-04 15:52:16.469148-05', NULL);
INSERT INTO public.users VALUES ('user-d906b1f5311aee9f', 'whung', 'b951d7ec3880b492aabbcb70c2d507629ee5980b1dd50af2963976be7f4da856', 817, 1, 2, '2026-05-04 16:30:16.043606-05', NULL);
INSERT INTO public.users VALUES ('user-bf0da99089c2f8d0', 'ianlam', 'e7b0a3d95208307e0ab96c1632f65799f0f387a267da9eaa04698bb84ea526e0', 6163, 1, 2, '2026-05-04 16:32:41.436276-05', NULL);


--
-- Data for Name: bets; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.bets VALUES ('bet-c24afa9b4d668a73', 'user-89a7b6a64ad96255', 'nba-lal-okc-g1', 'okc', -180, 70, 39, 'win', '2026-05-04 16:07:10.723806-05', '2026-05-04 16:07:21.978559-05');
INSERT INTO public.bets VALUES ('bet-be5f4915381deaae', 'user-89a7b6a64ad96255', 'nba-cle-det-g2', 'det', -105, 70, 67, 'loss', '2026-05-04 16:29:49.702287-05', '2026-05-04 16:30:00.973631-05');
INSERT INTO public.bets VALUES ('bet-fcb610b2472001f2', 'user-d906b1f5311aee9f', 'nba-lal-okc-g1', 'okc', -180, 90, 50, 'loss', '2026-05-04 16:30:43.896829-05', '2026-05-04 16:30:55.135384-05');
INSERT INTO public.bets VALUES ('bet-b696c78057c399a1', 'user-d906b1f5311aee9f', 'nba-lal-okc-g2', 'okc', -1050, 70, 7, 'win', '2026-05-04 16:31:48.231431-05', '2026-05-04 16:31:59.474096-05');
INSERT INTO public.bets VALUES ('bet-c8abc3c7034200c2', 'user-bf0da99089c2f8d0', 'nba-min-sas-g1', 'sas', -345, 250, 72, 'loss', '2026-05-04 16:33:00.03261-05', '2026-05-04 16:33:11.261436-05');
INSERT INTO public.bets VALUES ('bet-adc3f3be1dc7b228', 'user-bf0da99089c2f8d0', 'nba-det-cle-g1', 'cle', -160, 90, 56, 'loss', '2026-05-04 16:33:20.820902-05', '2026-05-04 16:33:32.04805-05');
INSERT INTO public.bets VALUES ('bet-fa73a7a233a84453', 'user-adbb38a768707731', 'nba-lal-okc-g1', 'lal', 155, 1000, 1550, 'loss', '2026-05-04 16:42:43.987011-05', '2026-05-04 16:42:55.241427-05');


--
-- Data for Name: parlays; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.parlays VALUES ('parlay-966146ff4e3897a6', 'user-89a7b6a64ad96255', 400, 17963, 'win', '2026-05-04 16:15:56.021176-05', '2026-05-04 16:26:11.213825-05');
INSERT INTO public.parlays VALUES ('parlay-76aa851d8681a2fe', 'user-d906b1f5311aee9f', 100, 3261, 'loss', '2026-05-04 16:31:25.190119-05', '2026-05-04 16:31:37.454517-05');
INSERT INTO public.parlays VALUES ('parlay-896e3e481c07e02b', 'user-bf0da99089c2f8d0', 350, 5503, 'win', '2026-05-04 16:34:02.098659-05', '2026-05-04 16:34:14.184241-05');


--
-- Data for Name: parlay_legs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.parlay_legs VALUES ('leg-016a3e62721328ff', 'parlay-966146ff4e3897a6', 'nba-min-sas-g1', 'sas', -345, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-13015bb550b1fcf2', 'parlay-966146ff4e3897a6', 'nba-phi-nyk-g1', 'phi-nba', 235, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-51752a90693d65ba', 'parlay-966146ff4e3897a6', 'nba-det-cle-g1', 'det', 135, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-2011abc733209f77', 'parlay-966146ff4e3897a6', 'nba-min-sas-g2', 'sas', -140, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-5d44968c0badb3a2', 'parlay-966146ff4e3897a6', 'mlb-atl-sea-506', 'atl', -125, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-131cd5da864c3d33', 'parlay-966146ff4e3897a6', 'nhl-min-col-g2', 'col', -215, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-5558c49720fbf961', 'parlay-76aa851d8681a2fe', 'nba-min-sas-g1', 'min-nba', 275, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-d39bbc013325b501', 'parlay-76aa851d8681a2fe', 'nba-phi-nyk-g1', 'phi-nba', 235, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-6725242f2ab67c2f', 'parlay-76aa851d8681a2fe', 'mlb-sd-bal-505', 'sd', -105, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-f609f7520b4ecff9', 'parlay-76aa851d8681a2fe', 'nhl-phi-car-g2', 'car', -270, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-cfd880d57839c497', 'parlay-896e3e481c07e02b', 'nba-phi-nyk-g1', 'phi-nba', 235, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-3156a383a262b605', 'parlay-896e3e481c07e02b', 'nba-min-sas-g2', 'sas', -140, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-2772e3d18e0d341b', 'parlay-896e3e481c07e02b', 'nhl-ana-vgk-g2', 'vgk', -170, NULL);
INSERT INTO public.parlay_legs VALUES ('leg-593bad9090c36862', 'parlay-896e3e481c07e02b', 'mlb-phi-chc-507', 'phi-mlb', -120, NULL);


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.sessions VALUES ('session-414283b5970b1c79', 'user-89a7b6a64ad96255', '2026-05-04 15:52:16.478632-05');
INSERT INTO public.sessions VALUES ('session-914a5d349ede438f', 'user-d906b1f5311aee9f', '2026-05-04 16:30:16.048785-05');
INSERT INTO public.sessions VALUES ('session-24edf5f997454020', 'user-bf0da99089c2f8d0', '2026-05-04 16:32:41.440852-05');
INSERT INTO public.sessions VALUES ('session-bf808ff2396f6e8d', 'user-adbb38a768707731', '2026-05-04 16:42:25.144706-05');
INSERT INTO public.sessions VALUES ('session-ea9bb4e0150df4fe', 'user-89a7b6a64ad96255', '2026-05-04 16:45:23.660442-05');


--
-- PostgreSQL database dump complete
--

\unrestrict Ly6gxnLD8ls951UfQr6VN6dH2WmthL0dCCCPJjA3uKUAQWchziz325iXBf6oOEj

