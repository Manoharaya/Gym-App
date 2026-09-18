/**
 * FitBeat Movement Coach Architecture Contracts
 * Day 81: Visual Movement Coach Foundation & Structured Movement Feedback
 *
 * NOTE: These contracts define the target representation and future provider interfaces
 * for computer vision, camera input streams, and pose comparison.
 * In Day 81, NO computer vision dependencies or live cameras are executed.
 */

export interface NormalizedLandmark {
  name: string; // e.g., 'LEFT_KNEE', 'RIGHT_HIP', 'SPINE_BASE'
  x: number; // 0.0 - 1.0
  y: number; // 0.0 - 1.0
  z?: number; // Normalized depth
  visibility?: number; // 0.0 - 1.0 confidence
}

export interface JointAngleMeasurement {
  joint: string; // e.g., 'KNEE_FLEXION', 'HIP_HINGE', 'ELBOW_FLEXION'
  angleDegrees: number;
  confidence: number;
}

export interface ObservedMovementState {
  timestampMs: number;
  observedPhase?: string;
  bodyLandmarks: NormalizedLandmark[];
  jointAngles: JointAngleMeasurement[];
  movementDirection?: 'DOWNWARD' | 'UPWARD' | 'LATERAL' | 'STATIONARY' | 'ROTATIONAL';
  confidence: number;
}

export interface ExpectedAlignmentExpectation {
  bodyRegion: string;
  targetJoint?: string;
  expectedAngleDegrees?: number;
  allowableToleranceDegrees?: number;
  cueNote?: string;
}

export interface ExpectedMovementState {
  phaseId?: string;
  phaseName: string;
  bodyPosition?: string;
  bodyOrientation?: string;
  movementDirection?: string;
  bodyRegions: string[];
  alignmentExpectations: ExpectedAlignmentExpectation[];
  rangeOfMotion?: string;
  tempo?: string;
  breathing?: string;
  stabilityRequirements?: string[];
  visualCues?: {
    id: string;
    label: string;
    type: string;
    x: number;
    y: number;
  }[];
}

export interface MovementDeviation {
  expectationId?: string;
  deviationType:
    | 'PHASE_MISMATCH'
    | 'POSITION_DEVIATION'
    | 'ALIGNMENT_DEVIATION'
    | 'ROM_DEVIATION'
    | 'TEMPO_DEVIATION'
    | 'STABILITY_DEVIATION'
    | 'BREATHING_MISMATCH'
    | 'MOVEMENT_DIRECTION';
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  observedValue?: any;
  expectedValue?: any;
  feedbackMessage: string;
  confidence: number;
}

export interface MovementComparisonResult {
  exerciseId: string;
  phaseId?: string;
  timestampMs: number;
  isDeviated: boolean;
  deviations: MovementDeviation[];
  educationalFeedback: string[];
  comparisonStatus: 'COMPARED' | 'FUTURE_PROVIDER_PENDING';
}

/**
 * Contract for future Camera / Sensor Observation Providers
 */
export interface MovementObservationProvider {
  readonly providerId: string;
  readonly isAvailable: boolean;
  startStream(): Promise<boolean>;
  stopStream(): Promise<void>;
  getCurrentObservation(): Promise<ObservedMovementState | null>;
}

/**
 * Contract for future Pose Analysis Providers (On-Device, Cloud, etc.)
 */
export interface PoseAnalysisProvider {
  readonly providerName: string;
  analyzeFrame(frameData: unknown): Promise<ObservedMovementState>;
  analyzeSequence?(sequenceData: unknown[]): Promise<ObservedMovementState[]>;
  detectLandmarks?(frameData: unknown): Promise<NormalizedLandmark[]>;
  estimateMovementPhase?(landmarks: NormalizedLandmark[]): Promise<string | null>;
}

/**
 * Contract for future Movement Comparison Service
 */
export interface MovementComparisonService {
  compareMovement(
    expected: ExpectedMovementState,
    observed: ObservedMovementState,
  ): Promise<MovementComparisonResult>;
}
