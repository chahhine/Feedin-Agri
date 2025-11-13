export interface Farm {
  farm_id: string;
  name: string;
  location?: string;
  owner_id: string;
  created_at?: Date;
  updated_at?: Date;
  devices?: Device[];
  sensors?: Sensor[];
}

export interface Device {
  device_id: string;
  name: string;
  location: string;
  status: DeviceStatus;
  farm_id: string;
  device_type?: string;
  description?: string;
  ip_address?: string;
  mac_address?: string;
  firmware_version?: string;
  last_seen?: Date;
  created_at?: Date;
  updated_at?: Date;
  sensors?: Sensor[];
}

export enum DeviceStatus {
  ONLINE = 'online',
  ACTIVE = 'active',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance'
}

export interface Sensor {
  id: number;
  sensor_id: string;
  farm_id: string;
  type: string;
  unit: string;
  device_id: string;
  location?: string;
  crop_id?: string;
  min_critical?: number;
  min_warning?: number;
  max_warning?: number;
  max_critical?: number;
  action_low?: string;
  action_high?: string;
  readings?: SensorReading[];
}

export interface SensorReading {
  id: string;
  sensor_id: string;
  value1?: number;
  value2?: number;
  createdAt: Date;
  sensor?: Sensor; // optional relation when backend includes relations
}

export interface Crop {
  crop_id: string;
  name: string;
  description?: string;
  variety?: string;
  
  // Lifecycle dates
  planting_date?: Date;
  expected_harvest_date?: Date;
  actual_harvest_date?: Date;
  germination_date?: Date;
  
  // Status and growth
  status: CropStatus;
  growth_stage?: GrowthStage;
  health_score?: number; // 0-100 percentage
  
  // Cultivation details
  area_size?: number; // in square meters or hectares
  area_unit?: 'sqm' | 'hectare' | 'acre';
  plant_count?: number;
  row_spacing?: number; // in cm
  plant_spacing?: number; // in cm
  
  // Yield tracking
  expected_yield?: number;
  actual_yield?: number;
  yield_unit?: string; // kg, tons, bushels, etc.
  
  // Environmental preferences
  optimal_temp_min?: number;
  optimal_temp_max?: number;
  optimal_humidity_min?: number;
  optimal_humidity_max?: number;
  water_requirements?: 'low' | 'medium' | 'high';
  sunlight_requirements?: 'shade' | 'partial' | 'full';
  
  // Soil preferences
  soil_type?: string; // sandy, clay, loam, etc.
  soil_ph_min?: number;
  soil_ph_max?: number;
  
  // Management tracking
  irrigation_method?: string; // drip, sprinkler, flood, etc.
  fertilizer_schedule?: string;
  pest_control_measures?: string;
  disease_resistance_rating?: number; // 0-10
  
  // Quality metrics
  quality_grade?: 'A' | 'B' | 'C' | 'Premium' | 'Standard';
  organic_certified?: boolean;
  gmo_free?: boolean;
  
  // Economics
  estimated_revenue?: number;
  actual_revenue?: number;
  cost_per_unit?: number;
  currency?: string;
  
  // Additional metadata
  notes?: string;
  tags?: string[]; // e.g., ['organic', 'high-priority', 'experimental']
  image_url?: string;
  
  // Relationships
  farm_id?: string;
  assigned_user_id?: string;
  parent_crop_id?: string; // for crop rotation tracking
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
  
  // Relations
  sensors?: Sensor[];
  farm?: Farm;
}

export enum CropStatus {
  PLANNED = 'planned',
  PLANTED = 'planted',
  GERMINATING = 'germinating',
  GROWING = 'growing',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  READY = 'ready',
  HARVESTED = 'harvested',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export enum GrowthStage {
  PLANNING = 'planning',
  SEEDING = 'seeding',
  GERMINATION = 'germination',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  POLLINATION = 'pollination',
  FRUITING = 'fruiting',
  RIPENING = 'ripening',
  MATURITY = 'maturity',
  HARVEST = 'harvest',
  POST_HARVEST = 'post_harvest'
}
