// src/entities/sensor-reading.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Sensor } from './sensor.entity';

@Entity('sensor_readings')
export class SensorReading {
  // Note: Schema has composite PK (id, created_at) for partitioning
  // TypeORM will handle this, but we define id as primary for queries
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sensor, (sensor) => sensor.readings)
  @JoinColumn({ name: 'sensor_id', referencedColumnName: 'sensor_id' })
  sensor: Sensor;

  @Column({ type: 'varchar', length: 36 })
  sensor_id: string;

  @Column({ type: 'float', nullable: true })
  value1: number;

  @Column({ type: 'float', nullable: true })
  value2: number;

  // This is part of the composite primary key in the schema (id, created_at)
  // TypeORM will work with this even though the schema has a composite PK for partitioning
  @Column({ type: 'timestamp', precision: 6, default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;
}