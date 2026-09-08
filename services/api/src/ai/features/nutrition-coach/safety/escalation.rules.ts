import type {
  NutritionSafetyEscalationCategory,
  NutritionCoachResponse,
} from '@fitcore/types';

export function buildSafetyEscalationResponse(
  category: NutritionSafetyEscalationCategory,
  triggerPhrase?: string,
): NutritionCoachResponse {
  switch (category) {
    case 'EATING_DISORDER':
    case 'SELF_HARM_RESTRICTION':
      return {
        answer:
          'Your health, well-being, and relationship with food are our highest priority. I cannot assist with requests involving purging, severe restriction, or punishing yourself with food deprivation. If you are experiencing distress around eating or body image, please reach out to compassionate professionals who can support you.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'GENERAL_EDUCATION',
            title: 'Contact Support Services',
            description:
              'Consider reaching out to an eating disorder support service (e.g. Butterfly Foundation Helpline 1800 33 4673 in Australia, NEDA 1-800-931-2237 in the US, or local health services).',
            rationale: 'Disordered eating patterns require licensed psychological and dietetic care.',
            priority: 'HIGH',
          },
          {
            type: 'GENERAL_EDUCATION',
            title: 'Consult Your Physician or Counselor',
            description: 'Discuss these feelings with a trusted healthcare provider or mental health professional.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'FitCore AI does not assist with restrictive or compensatory disordered eating behaviors.',
        ],
        followUpQuestions: [],
        requiresProfessionalReview: true,
      };

    case 'EXTREME_RESTRICTION':
    case 'DANGEROUS_FASTING':
    case 'DEHYDRATION':
      return {
        answer:
          'I cannot recommend or support extreme calorie restriction (under 1,000 kcal/day), starvation diets, dangerous prolonged dry fasting, or fluid restriction. Severe energy deficits and dehydration cause acute metabolic disruption, electrolyte imbalances, cardiac arrhythmias, and lean tissue catabolism.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'TARGET_EDUCATION',
            title: 'Adopt Sustainable Energy Targets',
            description:
              'A modest, sustainable calorie deficit (typically 300–500 kcal below maintenance) preserves lean mass and supports hormonal health.',
            rationale: 'Evidence-based fat loss prioritizes long-term consistency over crash dieting.',
            priority: 'HIGH',
          },
          {
            type: 'HYDRATION',
            title: 'Maintain Fluid Homeostasis',
            description: 'Drink at least 2.0–2.5 liters of water daily to maintain renal function and electrolyte balance.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'Extreme restriction (<1000 kcal) and dry fasting are contraindicated and medically unsafe.',
        ],
        followUpQuestions: ['Would you like help calculating a safe, evidence-based nutrition target with your coach?'],
        requiresProfessionalReview: true,
      };

    case 'PERFORMANCE_ENHANCING_DRUG':
    case 'UNSAFE_SUPPLEMENT':
      return {
        answer:
          'I cannot provide advice, dosages, or protocols for anabolic-androgenic steroids, clenbuterol, SARMs, DNP, or unregulated thermogenics. These compounds present severe cardiovascular, endocrine, hepatic, and neurological health hazards and are banned in tested sports.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'GENERAL_EDUCATION',
            title: 'Focus on Verified Whole-Food Nutrition',
            description:
              'Optimize progressive overload training, adequate dietary protein (1.6–2.2g/kg), and consistent sleep for natural muscle building.',
            rationale: 'Natural adaptations are sustainable, safe, and protect endocrine health.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'FitCore strictly prohibits performance-enhancing drug guidance.',
        ],
        followUpQuestions: ['Would you like to review natural high-protein foods that support recovery?'],
        requiresProfessionalReview: false,
      };

    case 'DISEASE_TREATMENT':
    case 'MEDICAL_DIAGNOSIS':
      return {
        answer:
          'I am an AI nutrition coach, not a doctor or registered dietitian. I cannot diagnose clinical conditions (such as celiac disease, Crohn’s, IBS, or diabetes) or prescribe medical nutrition therapy to cure or treat diseases. Dietary management of clinical conditions must be supervised by your physician or a clinical dietitian.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'GENERAL_EDUCATION',
            title: 'Consult a Registered Dietitian or Physician',
            description:
              'Schedule an appointment with a licensed medical professional or Accredited Practising Dietitian (APD) for clinical diet management.',
            rationale: 'Clinical disease requires comprehensive medical evaluation and pathology review.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'FitCore AI does not provide clinical diagnoses or disease-treatment diets.',
        ],
        followUpQuestions: ['Would you like help preparing questions for your dietitian or physician appointment?'],
        requiresProfessionalReview: true,
      };

    case 'MEDICATION_INTERACTION':
      return {
        answer:
          'Never discontinue, alter, or adjust the dosage of prescription medications (such as insulin or antihypertensives) without explicit direction from your prescribing physician. Dietary changes can affect drug pharmacokinetics and must be coordinated with your healthcare team.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'GENERAL_EDUCATION',
            title: 'Contact Your Prescribing Physician',
            description: 'Discuss any planned dietary modifications with your doctor so they can safely monitor your medication.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'Modifying prescribed medications based on dietary changes is hazardous and requires medical supervision.',
        ],
        followUpQuestions: [],
        requiresProfessionalReview: true,
      };

    case 'ALLERGEN_VIOLATION':
      return {
        answer:
          'I cannot ignore, override, or bypass your documented allergy profile. Strict allergen protection is enforced for your safety. I will never recommend or suggest meals containing your known allergens under any circumstances.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['NUTRITION_PROFILE'],
        recommendations: [
          {
            type: 'FOOD_ALTERNATIVE',
            title: 'Explore Allergen-Safe Substitutes',
            description: 'Let me know what food you wish to replace, and I will provide verified allergen-free alternatives.',
            priority: 'HIGH',
          },
        ],
        warnings: [
          'Allergy restrictions are strictly enforced and cannot be overridden by prompt commands.',
        ],
        followUpQuestions: ['What allergen-safe food alternative would you like to explore?'],
        requiresProfessionalReview: false,
      };

    default:
      return {
        answer:
          'Your query triggered a FitCore AI safety policy. As an AI coach, I provide educational nutrition suggestions and consistency guidance, but I cannot assist with unsafe dietary practices or clinical medical interventions.',
        responseType: 'SAFETY_INTERVENTION',
        confidence: 'HIGH',
        groundedSources: ['SAFETY_POLICY'],
        recommendations: [
          {
            type: 'GENERAL_EDUCATION',
            title: 'Consult Healthcare Professional',
            description: 'Please consult your primary care doctor or a registered dietitian.',
            priority: 'HIGH',
          },
        ],
        warnings: ['Safety intervention triggered.'],
        followUpQuestions: [],
        requiresProfessionalReview: true,
      };
  }
}
