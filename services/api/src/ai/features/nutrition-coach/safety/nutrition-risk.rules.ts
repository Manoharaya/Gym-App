import type { NutritionSafetyEscalationCategory } from '@fitcore/types';

export interface NutritionRiskRule {
  id: string;
  category: NutritionSafetyEscalationCategory;
  pattern: RegExp;
  severity: 'CAUTION' | 'RECOMMEND_PROFESSIONAL' | 'URGENT_ESCALATION';
  description: string;
}

export const NUTRITION_RISK_RULES: NutritionRiskRule[] = [
  // 1. Eating Disorders & Purging
  {
    id: 'ED_PURGING',
    category: 'EATING_DISORDER',
    pattern: /\b(vomit(ed|ing)?\s+after\s+(eating|meals)|purge\s+my\s+food|make\s+myself\s+throw\s+up|throw\s+up\s+after\s+(binge\s+)?eating|binge\s+and\s+purge|chew\s+and\s+spit|laxative(s)?\s+for\s+weight\s+loss)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Purging, forced vomiting, or laxative abuse detected',
  },
  {
    id: 'ED_SEVERE_GUILT_BINGE',
    category: 'EATING_DISORDER',
    pattern: /\b(hate\s+myself\s+for\s+eating|feel\s+disgusting\s+after\s+eating|uncontrollable\s+bingeing\s+episodes|anorexia|bulimia)\b/i,
    severity: 'RECOMMEND_PROFESSIONAL',
    description: 'Severe psychological distress or eating disorder terminology detected',
  },

  // 2. Extreme Calorie Restriction & Starvation
  {
    id: 'EXTREME_RESTRICTION_NUMERIC',
    category: 'EXTREME_RESTRICTION',
    pattern: /\b(eat\s+(under|less\s+than|only\s+)?([1-9]00|500)\s+calories|500\s+calories?\s+(a\s+day|daily)|extreme\s+calorie\s+deficit)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Dangerous extreme calorie restriction (<1000 kcal/day)',
  },
  {
    id: 'STARVATION_DIET',
    category: 'EXTREME_RESTRICTION',
    pattern: /\b(starv(e|ing)\s+myself|how\s+to\s+starve|stop\s+eating\s+completely\s+for\s+weeks|zero\s+calories\s+for\s+days)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Starvation diet pattern detected',
  },

  // 3. Dangerous Rapid Weight Loss
  {
    id: 'DANGEROUS_RAPID_LOSS',
    category: 'EXTREME_RESTRICTION',
    pattern: /\b(lose\s+(10|15|20)\s*(kg|kilos|pounds|lbs)\s+in\s+([1-7]\s*days|a\s+week)|drop\s+10kg\s+in\s+3\s+days|fastest\s+way\s+to\s+lose\s+20\s+pounds\s+in\s+3\s+days)\b/i,
    severity: 'RECOMMEND_PROFESSIONAL',
    description: 'Physiologically dangerous rapid weight loss target',
  },

  // 4. Unsafe Fasting & Dehydration Strategies
  {
    id: 'UNSAFE_FASTING',
    category: 'DANGEROUS_FASTING',
    pattern: /\b(dry\s+fast(ing)?\s+(for\s+days|for\s+a\s+week)|no\s+water\s+and\s+no\s+food\s+for\s+days|fast\s+for\s+2\s+weeks\s+straight)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Dangerous prolonged dry fasting or multi-day fluid restriction',
  },
  {
    id: 'DEHYDRATION_WEIGHT_CUT',
    category: 'DEHYDRATION',
    pattern: /\b(stop\s+drinking\s+water\s+to\s+lose\s+weight|sweat\s+suit\s+to\s+dehydrate|diuretic(s)?\s+to\s+cut\s+weight|flush\s+all\s+water\s+out\s+of\s+my\s+body)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Dangerous intentional dehydration or diuretic abuse for weight manipulation',
  },

  // 5. Performance-Enhancing Drugs & Unsafe Supplements
  {
    id: 'PERFORMANCE_ENHANCING_DRUGS',
    category: 'PERFORMANCE_ENHANCING_DRUG',
    pattern: /\b(anabolic\s+steroids|clenbuterol\s+(dosage|cycle)|sarms\s+(stack|cycle)|dnp\s+(fat\s+burner|dosage)|trenbolone|winstrol|anavar\s+dosage)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Performance enhancing drugs or banned thermogenic compounds',
  },
  {
    id: 'UNSAFE_SUPPLEMENTS',
    category: 'UNSAFE_SUPPLEMENT',
    pattern: /\b(illegal\s+fat\s+burner|ephedra\s+diet\s+pills|tapeworm\s+diet|miracle\s+diet\s+pill)\b/i,
    severity: 'RECOMMEND_PROFESSIONAL',
    description: 'Unsafe or prohibited supplement inquiry',
  },

  // 6. Medical Nutrition Therapy & Disease Curing Claims
  {
    id: 'DISEASE_CURE_CLAIM',
    category: 'DISEASE_TREATMENT',
    pattern: /\b(cure\s+(my\s+)?(diabetes|cancer|kidney\s+disease|renal\s+failure|hypertension|crohn's|ulcerative\s+colitis)|treat\s+my\s+cancer\s+with\s+nutrition|reverse\s+renal\s+failure\s+diet)\b/i,
    severity: 'RECOMMEND_PROFESSIONAL',
    description: 'Request for medical nutrition therapy or claim to cure serious clinical disease via diet',
  },
  {
    id: 'MEDICAL_DIAGNOSIS_REQUEST',
    category: 'MEDICAL_DIAGNOSIS',
    pattern: /\b(diagnose\s+(if\s+i\s+have|my)\s+(celiac|crohn's|ibs|diabetes|food\s+allergy)|do\s+i\s+have\s+celiac\s+disease|what\s+gastrointestinal\s+disease\s+do\s+i\s+have)\b/i,
    severity: 'RECOMMEND_PROFESSIONAL',
    description: 'Request to diagnose a clinical condition or food allergy',
  },

  // 7. Medication Interactions
  {
    id: 'MEDICATION_INTERACTIONS',
    category: 'MEDICATION_INTERACTION',
    pattern: /\b(can\s+i\s+stop\s+taking\s+(my\s+)?insulin\s+if\s+i\s+eat|replace\s+my\s+medication\s+with\s+food|stop\s+taking\s+(my\s+)?(medication|insulin|metformin|pills)|stop\s+my\s+blood\s+pressure\s+pills\s+diet|adjust\s+my\s+medication\s+dose)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Request to alter or cease physician-prescribed medication based on diet',
  },

  // 8. Self-Harm Food Restriction
  {
    id: 'SELF_HARM_RESTRICTION',
    category: 'SELF_HARM_RESTRICTION',
    pattern: /\b(punish\s+myself\s+by\s+not\s+eating|starve\s+myself\s+as\s+punishment|don't\s+deserve\s+food|hurt\s+myself\s+through\s+fasting)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Self-harm-related food restriction',
  },

  // 9. Allergen Bypass Attempts
  {
    id: 'ALLERGEN_BYPASS_ATTEMPT',
    category: 'ALLERGEN_VIOLATION',
    pattern: /\b(ignore\s+(.*?)my\s+(peanut\s+)?(allergy|allergies)|bypass\s+(my\s+)?allergy|override\s+my\s+allergy|it's\s+fine\s+if\s+i\s+eat\s+peanuts\s+even\s+though\s+i'm\s+allergic)\b/i,
    severity: 'URGENT_ESCALATION',
    description: 'Intentional attempt to bypass safety-critical allergy restrictions',
  },
];
