/**
 * Unified Logistics Services — barrel export.
 *
 * All logistics domain operations go through these services.
 * No logistics logic should exist outside this module.
 */

// Phase 1: Core services
export { LogisticsOrchestratorService } from './LogisticsOrchestratorService';
export { TripManagementService } from './TripManagementService';
export { ReverseLogisticsService } from './ReverseLogisticsService';
export { LoadPoolingService } from './LoadPoolingService';
export { RouteClusterService } from './RouteClusterService';
export { LegacyBridgeService } from './LegacyBridgeService';

// Phase 2: Orchestration engine
export { VehicleCapacityService } from './VehicleCapacityService';
export { TripGenerationService } from './TripGenerationService';
export { LogisticsMatchingEngine } from './LogisticsMatchingEngine';
export { LogisticsEventService } from './LogisticsEventService';

// Phase 6: Recommendation engine
export { VehicleRecommendationService } from './VehicleRecommendationService';

export type * from './types';
