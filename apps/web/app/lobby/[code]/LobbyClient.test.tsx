import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyClient } from './LobbyClient';

vi.mock('@/hooks/useColyseusRoom', () => ({
  useColyseusRoom: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/components/board/Board', () => ({
  Board: () => <div data-testid="board" />,
}));

vi.mock('@/components/lobby/HostChecklistModal', () => ({
  HostChecklistModal: () => null,
}));

vi.mock('@/components/lobby/PlayersList', () => ({
  PlayersList: () => <div data-testid="players" />,
}));

vi.mock('@/components/lobby/ProfileEditor', () => ({
  ProfileEditor: () => <div data-testid="profile-editor" />,
}));

vi.mock('@/components/lobby/PinControls', () => ({
  PinControls: () => null,
}));

vi.mock('@/components/lobby/QRCodeShare', () => ({
  QRCodeShare: () => null,
}));

vi.mock('@/lib/colyseusToBoard', () => ({
  colyseusStateToBoard: (state: Record<string, unknown>) => state,
}));

import { useColyseusRoom } from '@/hooks/useColyseusRoom';

const mockedUseColyseusRoom = vi.mocked(useColyseusRoom);

const makeState = (overrides: Record<string, unknown> = {}) => ({
  phase: 'lobby',
  boardSeed: 'TEST-123',
  players: new Map([
    [
      'session-1',
      {
        id: 'session-1',
        name: 'Alice',
        suit: 'spades',
        color: '#ff0000',
        emoji: '🎯',
        isHost: true,
        connected: true,
        exited: false,
      },
    ],
  ]),
  checklistAcked: false,
  eventLog: [],
  difficultyLevel: 'soft',
  maxSipsPerPlayerPerGame: 0,
  lobbyPin: '',
  ...overrides,
});

const makeRoom = (sessionId = 'session-1') => ({
  sessionId,
  state: makeState(),
  send: vi.fn(),
  leave: vi.fn(),
});

describe('LobbyClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading when state.players is undefined', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'joined' as const,
      state: { phase: 'lobby' },
      error: null,
      room: makeRoom(),
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText('Chargement du state…')).toBeInTheDocument();
  });

  it('renders lobby when state has players', () => {
    const state = makeState();
    mockedUseColyseusRoom.mockReturnValue({
      status: 'joined' as const,
      state,
      error: null,
      room: makeRoom(),
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText('Lobby')).toBeInTheDocument();
    expect(screen.getByText(/Joueurs/)).toBeInTheDocument();
  });

  it('renders connecting state', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'connecting' as const,
      state: null,
      error: null,
      room: null,
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText(/Connexion à la partie ABCD-2345/)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'error' as const,
      state: null,
      error: 'Room not found',
      room: null,
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText('Room not found')).toBeInTheDocument();
  });

  it('renders invalid code', () => {
    render(<LobbyClient code="AB" name="Alice" />);

    expect(screen.getByText('Code invalide')).toBeInTheDocument();
  });

  it('renders name missing', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'connecting' as const,
      state: null,
      error: null,
      room: null,
    });

    render(<LobbyClient code="ABCD-2345" name="" />);

    expect(screen.getByText('Pseudo manquant')).toBeInTheDocument();
  });

  it('shows 401 PIN error', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'error' as const,
      state: null,
      error: '[401] PIN required',
      room: null,
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText('Cette partie est protégée par un code')).toBeInTheDocument();
  });

  it('shows 403 wrong PIN error', () => {
    mockedUseColyseusRoom.mockReturnValue({
      status: 'error' as const,
      state: null,
      error: '[403] Wrong PIN',
      room: null,
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText('Code incorrect')).toBeInTheDocument();
  });

  it('shows incomplete profile start button', () => {
    const state = makeState({
      players: new Map([
        [
          'session-1',
          {
            id: 'session-1',
            name: 'Alice',
            suit: '',
            color: '',
            emoji: '',
            isHost: true,
            connected: true,
            exited: false,
          },
        ],
        [
          'session-2',
          {
            id: 'session-2',
            name: 'Bob',
            suit: 'hearts',
            color: '#ff0000',
            emoji: '🎯',
            isHost: false,
            connected: true,
            exited: false,
          },
        ],
      ]),
      checklistAcked: true,
    });
    mockedUseColyseusRoom.mockReturnValue({
      status: 'joined' as const,
      state,
      error: null,
      room: makeRoom(),
    });

    render(<LobbyClient code="ABCD-2345" name="Alice" />);

    expect(screen.getByText(/En attente des choix de 1 joueur/)).toBeInTheDocument();
  });
});
