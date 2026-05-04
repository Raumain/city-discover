import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';
import MapScreen from '../index';
import { useMapViewModel } from '@/src/features/discovery/hooks/useMapViewModel';

// Mock the view model hook
jest.mock('@/src/features/discovery/hooks/useMapViewModel');

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const MapView = (props: any) => React.createElement('MapView', props, props.children);
  MapView.Polyline = (props: any) => React.createElement('Polyline', props, props.children);
  return {
    __esModule: true,
    default: MapView,
    Polyline: MapView.Polyline,
  };
});

describe('MapScreen', () => {
  const mockStartTracking = jest.fn();
  const mockStopTracking = jest.fn();
  const mockRetryLoad = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (useMapViewModel as jest.Mock).mockReturnValue({
      loading: true,
      error: null,
      metrics: null,
      segments: [],
      nearbyUnexploredStreets: [],
      weeklyMotivationDecision: null,
      latestSessionSummary: null,
      tracking: { status: 'idle' },
      startTracking: mockStartTracking,
      stopTracking: mockStopTracking,
      retryLoad: mockRetryLoad,
    });

    render(<MapScreen />);
    expect(screen.getByText('Loading discovery data…')).toBeTruthy();
  });

  it('renders error state when there is an error', () => {
    (useMapViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: new Error('Failed to load'),
      metrics: { lengthPercent: 0, segmentPercent: 0, totalLengthMeters: 0, discoveredLengthMeters: 0 },
      segments: [],
      nearbyUnexploredStreets: [],
      weeklyMotivationDecision: null,
      latestSessionSummary: null,
      tracking: { status: 'idle' },
      startTracking: mockStartTracking,
      stopTracking: mockStopTracking,
      retryLoad: mockRetryLoad,
    });

    render(<MapScreen />);
    expect(screen.getByText('Could not load discovery data.')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Retry'));
    expect(mockRetryLoad).toHaveBeenCalled();
  });

  it('renders discovery data correctly', () => {
    (useMapViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      metrics: {
        totalLengthMeters: 1000,
        discoveredLengthMeters: 500,
        lengthPercent: 50.0,
        segmentPercent: 40.0,
      },
      segments: [],
      nearbyUnexploredStreets: ['Main St', 'Broadway'],
      weeklyMotivationDecision: {
        shouldSendNudge: true,
        reason: 'behind_goal',
        suggestion: 'Walk 500m to reach your goal',
      },
      latestSessionSummary: {
        acceptedPointCount: 15,
        distanceMeters: 1250,
      },
      tracking: { status: 'idle' },
      startTracking: mockStartTracking,
      stopTracking: mockStopTracking,
      retryLoad: mockRetryLoad,
    });

    render(<MapScreen />);
    
    // Check coverage metrics
    expect(screen.getByText('You discovered 50.0% of your city streets by length.')).toBeTruthy();
    expect(screen.getByText('Secondary metric: 40.0% of segments')).toBeTruthy();
    
    // Check nearby streets
    expect(screen.getByText('• Main St')).toBeTruthy();
    expect(screen.getByText('• Broadway')).toBeTruthy();

    // Check motivation
    expect(screen.getByText('Nudge planned (behind_goal)')).toBeTruthy();
    expect(screen.getByText('Walk 500m to reach your goal')).toBeTruthy();

    // Check session button and state
    expect(screen.getByText('Start walk session')).toBeTruthy();
    expect(screen.getByText('Session distance: 1.25 km')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Start walk session'));
    expect(mockStartTracking).toHaveBeenCalled();
  });

  it('renders active session state correctly', () => {
    (useMapViewModel as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      metrics: {
        totalLengthMeters: 1000,
        discoveredLengthMeters: 500,
        lengthPercent: 50.0,
        segmentPercent: 40.0,
      },
      segments: [],
      nearbyUnexploredStreets: [],
      weeklyMotivationDecision: null,
      latestSessionSummary: {
        acceptedPointCount: 15,
        distanceMeters: 1250,
      },
      tracking: { status: 'active' },
      startTracking: mockStartTracking,
      stopTracking: mockStopTracking,
      retryLoad: mockRetryLoad,
    });

    render(<MapScreen />);
    
    expect(screen.getByText('Stop walk session')).toBeTruthy();
    expect(screen.getByText('Active (foreground tracking)')).toBeTruthy();
    
    fireEvent.press(screen.getByText('Stop walk session'));
    expect(mockStopTracking).toHaveBeenCalled();
  });
});
