import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import StatsScreen from '../stats';
import { useStatsViewModel } from '@/src/features/discovery/hooks/useStatsViewModel';

// Mock the view model hook
jest.mock('@/src/features/discovery/hooks/useStatsViewModel');

describe('StatsScreen', () => {
  const mockRetryLoad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (useStatsViewModel as jest.Mock).mockReturnValue({
      loading: true,
      error: null,
      metrics: null,
      periodStats: null,
      weeklyMotivationDecision: null,
      retryLoad: mockRetryLoad,
    });

    render(<StatsScreen />);
    expect(screen.getByText('Loading stats…')).toBeTruthy();
  });

  it('renders error state when there is an error', () => {
    (useStatsViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: new Error('Failed to load'),
      metrics: { lengthPercent: 0 },
      periodStats: { steps: 0, kilometers: 0, periodDiscoveryPercent: 0 },
      weeklyMotivationDecision: null,
      retryLoad: mockRetryLoad,
    });

    render(<StatsScreen />);
    expect(screen.getByText('Could not load stats.')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Retry loading'));
    expect(mockRetryLoad).toHaveBeenCalled();
  });

  it('renders stats data correctly', () => {
    (useStatsViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      metrics: {
        lengthPercent: 25.5,
      },
      periodStats: {
        steps: 8500,
        kilometers: 6.2,
        periodDiscoveryPercent: 1.5,
      },
      weeklyMotivationDecision: {
        reason: 'on_track',
      },
      retryLoad: mockRetryLoad,
    });

    render(<StatsScreen />);
    
    // Check steps and kilometers
    expect(screen.getByText('8,500')).toBeTruthy();
    expect(screen.getByText('6.2 km')).toBeTruthy();
    
    // Check discovery
    expect(screen.getByText('1.50%')).toBeTruthy();
    expect(screen.getByText('25.50%')).toBeTruthy();
    
    // Check motivation
    expect(screen.getByText('on_track')).toBeTruthy();
  });

  it('allows switching between day and week modes', () => {
    (useStatsViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      metrics: {
        lengthPercent: 25.5,
      },
      periodStats: {
        steps: 8500,
        kilometers: 6.2,
        periodDiscoveryPercent: 1.5,
      },
      weeklyMotivationDecision: null,
      retryLoad: mockRetryLoad,
    });

    render(<StatsScreen />);
    
    fireEvent.press(screen.getByText('WEEK'));
    // Since we mocked useStatsViewModel, the implementation of how it reacts to mode changes
    // in the real hook isn't executed here. We just check if the UI allows interaction.
    expect(screen.getByText('WEEK')).toBeTruthy();
  });
});
