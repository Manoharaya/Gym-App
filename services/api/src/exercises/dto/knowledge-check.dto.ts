import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'IMAGE_CHOICE'
  | 'ORDERING'
  | 'MATCHING';

export type QuestionDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export class CreateKnowledgeAnswerDto {
  @ApiProperty({ description: 'Text content of the answer option' })
  @IsString()
  answerText: string;

  @ApiPropertyOptional({ description: 'Flag indicating whether this option is correct (server-only)', default: false })
  @IsOptional()
  @IsBoolean()
  isCorrect?: boolean;

  @ApiPropertyOptional({ description: 'Specific rationale for why this option is correct or incorrect' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Visual asset URL for image-choice answers' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Media record ID reference' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Display order index', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'Target match value for MATCHING questions' })
  @IsOptional()
  @IsString()
  matchTarget?: string;

  @ApiPropertyOptional({ description: 'Target 1-based order position for ORDERING questions' })
  @IsOptional()
  @IsNumber()
  correctOrderIndex?: number;
}

export class CreateKnowledgeQuestionDto {
  @ApiProperty({ description: 'Prompt or question text' })
  @IsString()
  questionText: string;

  @ApiProperty({
    description: 'Question interaction type',
    enum: ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'IMAGE_CHOICE', 'ORDERING', 'MATCHING'],
    default: 'MULTIPLE_CHOICE',
  })
  @IsIn(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'IMAGE_CHOICE', 'ORDERING', 'MATCHING'])
  questionType: QuestionType;

  @ApiPropertyOptional({
    description: 'Pedagogical difficulty level',
    enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
    default: 'BEGINNER',
  })
  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ description: 'Question presentation order', default: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ description: 'General explanatory rationale shown after submission' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Author-crafted positive feedback message' })
  @IsOptional()
  @IsString()
  correctFeedback?: string;

  @ApiPropertyOptional({ description: 'Author-crafted constructive correction message' })
  @IsOptional()
  @IsString()
  incorrectFeedback?: string;

  @ApiPropertyOptional({ description: 'Optional hint available upon member request' })
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiPropertyOptional({ description: 'Associated ExerciseMedia ID' })
  @IsOptional()
  @IsString()
  mediaId?: string;

  @ApiPropertyOptional({ description: 'Direct image or video URL' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: 'Accessible image alternative text' })
  @IsOptional()
  @IsString()
  mediaAltText?: string;

  @ApiPropertyOptional({ description: 'Linked exercise movement phase ID' })
  @IsOptional()
  @IsString()
  exercisePhaseId?: string;

  @ApiPropertyOptional({ description: 'Qualitative structural metadata (e.g. matching items list)' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({ description: 'Answer options list', type: [CreateKnowledgeAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKnowledgeAnswerDto)
  answers: CreateKnowledgeAnswerDto[];
}

export class UpdateKnowledgeQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiPropertyOptional({ enum: ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'IMAGE_CHOICE', 'ORDERING', 'MATCHING'] })
  @IsOptional()
  @IsIn(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'IMAGE_CHOICE', 'ORDERING', 'MATCHING'])
  questionType?: QuestionType;

  @ApiPropertyOptional({ enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] })
  @IsOptional()
  @IsIn(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'])
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correctFeedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incorrectFeedback?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaAltText?: string;

  @ApiPropertyOptional({ type: [CreateKnowledgeAnswerDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKnowledgeAnswerDto)
  answers?: CreateKnowledgeAnswerDto[];
}

export class CreateKnowledgeCheckDto {
  @ApiProperty({ description: 'Title of the assessment' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Overview description of what is tested' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Member instructions prior to starting' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Passing threshold score in percentage (e.g. 70 for 70%)', default: 70 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  passingScore?: number;

  @ApiPropertyOptional({ description: 'Maximum allowed attempts (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  attemptLimit?: number;

  @ApiPropertyOptional({ description: 'Time limit in minutes (null = untimed)' })
  @IsOptional()
  @IsNumber()
  timeLimitMinutes?: number;

  @ApiPropertyOptional({ description: 'Whether passing this assessment is required to complete the lesson', default: false })
  @IsOptional()
  @IsBoolean()
  isRequiredForLesson?: boolean;

  @ApiPropertyOptional({ description: 'Associated LearningPathLesson ID' })
  @IsOptional()
  @IsString()
  lessonId?: string;

  @ApiPropertyOptional({ description: 'Associated Exercise ID' })
  @IsOptional()
  @IsString()
  exerciseId?: string;
}

export class UpdateKnowledgeCheckDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  passingScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  attemptLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  timeLimitMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequiredForLesson?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional()
  @IsIn(['DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'])
  contentStatus?: string;
}

export class SubmitQuestionResponseDto {
  @ApiProperty({ description: 'Question ID being answered' })
  @IsString()
  questionId: string;

  @ApiPropertyOptional({ description: 'Selected Answer IDs (for MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, IMAGE_CHOICE)', type: [String] })
  @IsOptional()
  @IsArray()
  selectedAnswerIds?: string[];

  @ApiPropertyOptional({ description: 'Ordered Answer/Item IDs in submitted order (for ORDERING)', type: [String] })
  @IsOptional()
  @IsArray()
  orderedItemIds?: string[];

  @ApiPropertyOptional({ description: 'Key-value map of submitted term-to-target pairs (for MATCHING)' })
  @IsOptional()
  matchingPairs?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether member used hint on this question', default: false })
  @IsOptional()
  @IsBoolean()
  hintsUsed?: boolean;
}

export class CompleteKnowledgeAttemptDto {
  @ApiPropertyOptional({ description: 'Total elapsed time spent on assessment in seconds', default: 0 })
  @IsOptional()
  @IsNumber()
  timeSpentSeconds?: number;
}

// ---------------------------------------------
// Response Payloads (Client Protection Enforced)
// ---------------------------------------------

export class PlayerAnswerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  questionId: string;

  @ApiProperty()
  answerText: string;

  @ApiPropertyOptional()
  mediaUrl?: string | null;

  @ApiProperty()
  sortOrder: number;
}

export class PlayerQuestionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  checkId: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  questionType: QuestionType;

  @ApiProperty()
  difficulty: QuestionDifficulty;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  hint?: string | null;

  @ApiPropertyOptional()
  mediaUrl?: string | null;

  @ApiPropertyOptional()
  mediaAltText?: string | null;

  @ApiProperty({ type: [PlayerAnswerDto] })
  answers: PlayerAnswerDto[];

  @ApiPropertyOptional({ type: [String], description: 'Target terms list for matching questions' })
  matchTargets?: string[];

  @ApiPropertyOptional({ description: 'Structured items for ordering/matching' })
  metadata?: Record<string, any>;
}

export class KnowledgeCheckPlayerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  instructions?: string | null;

  @ApiProperty()
  passingScore: number;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  isRequiredForLesson: boolean;

  @ApiPropertyOptional()
  attemptLimit?: number | null;

  @ApiPropertyOptional()
  timeLimitMinutes?: number | null;

  @ApiPropertyOptional()
  activeAttemptId?: string | null;

  @ApiPropertyOptional()
  lessonId?: string | null;

  @ApiPropertyOptional()
  pathId?: string | null;

  @ApiProperty({ type: [PlayerQuestionDto] })
  questions: PlayerQuestionDto[];
}

export class QuestionFeedbackDto {
  @ApiProperty()
  questionId: string;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  feedback: string;

  @ApiPropertyOptional()
  explanation?: string | null;

  @ApiPropertyOptional()
  nextQuestionIndex?: number | null;

  @ApiProperty()
  totalQuestions: number;

  @ApiProperty()
  answeredCount: number;
}

export class AttemptResultDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  checkId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  status: 'PASSED' | 'FAILED' | 'COMPLETED';

  @ApiProperty()
  score: number;

  @ApiProperty()
  correctCount: number;

  @ApiProperty()
  questionCount: number;

  @ApiProperty()
  passed: boolean;

  @ApiProperty()
  passingScore: number;

  @ApiProperty()
  timeSpentSeconds: number;

  @ApiPropertyOptional()
  lessonId?: string | null;

  @ApiPropertyOptional()
  pathId?: string | null;

  @ApiProperty({ type: [String] })
  reviewRecommendations: string[];
}

export class AttemptReviewItemDto {
  @ApiProperty()
  questionId: string;

  @ApiProperty()
  questionText: string;

  @ApiProperty()
  questionType: QuestionType;

  @ApiProperty()
  isCorrect: boolean;

  @ApiProperty()
  yourAnswer: any;

  @ApiProperty()
  correctAnswer: any;

  @ApiPropertyOptional()
  explanation?: string | null;

  @ApiPropertyOptional()
  hintUsed?: boolean;
}

export class AttemptReviewDto {
  @ApiProperty()
  attemptId: string;

  @ApiProperty()
  checkId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  score: number;

  @ApiProperty()
  passed: boolean;

  @ApiProperty()
  completedAt: string;

  @ApiProperty({ type: [AttemptReviewItemDto] })
  items: AttemptReviewItemDto[];
}
