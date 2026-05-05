--
-- PostgreSQL database dump
--

\restrict AdeIt5B4LBtVdOoibNwrzJRpftNFYszCxXUBqnRp89Cs8uXCXRs1uzeW1oLIVQV

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bets (
    id text NOT NULL,
    user_id text NOT NULL,
    game_id text NOT NULL,
    selected_team_id text NOT NULL,
    odds integer NOT NULL,
    wager integer NOT NULL,
    potential_win integer NOT NULL,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT bets_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])))
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id text NOT NULL,
    sport_id text NOT NULL,
    home_team_id text NOT NULL,
    away_team_id text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    status text NOT NULL,
    home_odds integer NOT NULL,
    away_odds integer NOT NULL,
    ou numeric(5,1),
    storyline text,
    outcome_team_id text,
    home_score integer,
    away_score integer,
    clock text,
    betting_locked boolean DEFAULT false NOT NULL,
    CONSTRAINT games_status_check CHECK ((status = ANY (ARRAY['upcoming'::text, 'live'::text, 'final'::text])))
);


--
-- Name: parlay_legs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parlay_legs (
    id text NOT NULL,
    parlay_id text NOT NULL,
    game_id text NOT NULL,
    selected_team_id text NOT NULL,
    odds integer NOT NULL,
    result text,
    CONSTRAINT parlay_legs_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])))
);


--
-- Name: parlays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parlays (
    id text NOT NULL,
    user_id text NOT NULL,
    wager integer NOT NULL,
    potential_win integer DEFAULT 0 NOT NULL,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    settled_at timestamp with time zone,
    CONSTRAINT parlays_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])))
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    token text NOT NULL,
    user_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sports (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id text NOT NULL,
    sport_id text NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    code text NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    points integer DEFAULT 1000 NOT NULL,
    wins integer DEFAULT 0 NOT NULL,
    losses integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    depleted_at timestamp with time zone
);


--
-- Name: bets bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_pkey PRIMARY KEY (id);


--
-- Name: games games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: parlay_legs parlay_legs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlay_legs
    ADD CONSTRAINT parlay_legs_pkey PRIMARY KEY (id);


--
-- Name: parlays parlays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlays
    ADD CONSTRAINT parlays_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token);


--
-- Name: sports sports_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_name_key UNIQUE (name);


--
-- Name: sports sports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sports
    ADD CONSTRAINT sports_pkey PRIMARY KEY (id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users_username_lower_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_lower_unique ON public.users USING btree (lower(username));


--
-- Name: bets bets_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: bets bets_selected_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_selected_team_id_fkey FOREIGN KEY (selected_team_id) REFERENCES public.teams(id);


--
-- Name: bets bets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bets
    ADD CONSTRAINT bets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: games games_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id);


--
-- Name: games games_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id);


--
-- Name: games games_outcome_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_outcome_team_id_fkey FOREIGN KEY (outcome_team_id) REFERENCES public.teams(id);


--
-- Name: games games_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- Name: parlay_legs parlay_legs_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlay_legs
    ADD CONSTRAINT parlay_legs_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.games(id);


--
-- Name: parlay_legs parlay_legs_parlay_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlay_legs
    ADD CONSTRAINT parlay_legs_parlay_id_fkey FOREIGN KEY (parlay_id) REFERENCES public.parlays(id) ON DELETE CASCADE;


--
-- Name: parlay_legs parlay_legs_selected_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlay_legs
    ADD CONSTRAINT parlay_legs_selected_team_id_fkey FOREIGN KEY (selected_team_id) REFERENCES public.teams(id);


--
-- Name: parlays parlays_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parlays
    ADD CONSTRAINT parlays_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id);


--
-- PostgreSQL database dump complete
--

\unrestrict AdeIt5B4LBtVdOoibNwrzJRpftNFYszCxXUBqnRp89Cs8uXCXRs1uzeW1oLIVQV

