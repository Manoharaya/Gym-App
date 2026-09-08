import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReactivationWorkflowState } from '@fitcore/types';

export class UpdateReactivationWorkflowDto {
  @ApiProperty({
    description: 'Internal reactivation workflow state',
    enum: ['NO_ACTION', 'FOLLOW_UP_RECOMMENDED', 'FOLLOW_UP_IN_PROGRESS', 'REENGAGED'],
  })
  @IsString()
  @IsIn(['NO_ACTION', 'FOLLOW_UP_RECOMMENDED', 'FOLLOW_UP_IN_PROGRESS', 'REENGAGED'])
  workflowState!: ReactivationWorkflowState;
}
