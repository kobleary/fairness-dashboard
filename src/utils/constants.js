// Helper function to determine reference group
export function getReferenceGroup(demographicGroup) {
  const genderGroups = ['Female'];
  return genderGroups.includes(demographicGroup) ? 'Male' : 'White';
}

// Helper function to determine data sources based on measures
export function getDataSources(measures) {
  const measuresArray = Array.isArray(measures) ? measures : [measures];
  const needsICEMcDash = measuresArray.some(m =>
    m === 'Predictive Parity' || m === 'Representativeness'
  );
  const needsHMDA = measuresArray.some(m =>
    m !== 'Predictive Parity' && m !== 'Representativeness'
  );

  if (needsHMDA && needsICEMcDash) {
    return 'Source: Authors calculations based on HMDA and ICE, McDash data';
  } else if (needsICEMcDash) {
    return 'Source: Authors calculations based on ICE, McDash data';
  } else {
    return 'Source: Authors calculations based on HMDA data';
  }
}

// Helper function to determine dynamic decimal places
export function getDynamicDecimals(values) {
  if (!values || values.length === 0) return 2;
  const nonNullValues = values.filter(v => v != null);
  if (nonNullValues.length === 0) return 2;

  const minVal = Math.min(...nonNullValues);
  const maxVal = Math.max(...nonNullValues);
  const range = Math.abs(maxVal - minVal);

  if (range === 0) return 2;
  if (range < 0.1) return 3;
  if (range < 1) return 2;
  if (range < 10) return 2;
  return 1;
}

// State abbreviation to full name mapping
export const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia', 'U.S.': 'U.S.'
};

// Fairness measure hover messages
export const FAIRNESS_MESSAGES = {
  'Marginal Candidates': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    // Negative values mean HIGHER default rates for marginal candidates (inverted)
    const comparison = value >= 0 ? 'lower' : 'higher';
    return `In ${state}, default rates for ${race} borrowers at the margin--or borrowers who submit one application resulting in an approval and another resulting in a denial--were ${absValue} percentage points ${comparison} than default rates for ${referenceGroup} borrowers at the margin.`;
  },
  'Statistical Parity': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, denial rates for ${race} applicants were ${absValue} percentage points ${comparison} than denial rates for ${referenceGroup} applicants.`;
  },
  'Predictive Parity': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, default rates for ${race} borrowers were ${absValue} percentage points ${comparison} than default rates for ${referenceGroup} borrowers.`;
  },
  'Conditional Statistical Parity - Large': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, denial rates for ${race} applicants were ${absValue} percentage points ${comparison} than denial rates for ${referenceGroup} applicants, conditional on a large set of features (indicator for whether a coapplicant is present, loan purpose, the outcome of the automated underwriting system, applicant income, loan amount, credit score, debt-to-income ratio, and loan-to-value ratio).`;
  },
  'Conditional Statistical Parity - Small': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, denial rates for ${race} applicants were ${absValue} percentage points ${comparison} than denial rates for ${referenceGroup} applicants, conditional on a small set of features (applicant income, loan amount, loan purpose, and an indicator for whether a coapplicant is present).`;
  },
  'Equality of Opportunity': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, denial rates for creditworthy ${race} applicants were ${absValue} percentage points ${comparison} than denial rates for creditworthy ${referenceGroup} applicants.`;
  },
  'Equality of Goodwill': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, denial rates for non-creditworthy ${race} applicants were ${absValue} percentage points ${comparison} than denial rates for non-creditworthy ${referenceGroup} applicants.`;
  },
  'Representativeness': (state, race, value, referenceGroup) => {
    const absValue = Math.abs(value).toFixed(2);
    const comparison = value >= 0 ? 'higher' : 'lower';
    return `In ${state}, the fraction of creditworthy ${race} applicants was ${absValue} percentage points ${comparison} than the fraction of approved ${race} applicants.`;
  }
};

// Detailed fairness measure definitions
export const FAIRNESS_DEFINITIONS = {
  'Statistical Parity': 'Difference in denial rates. Statistical parity is satisfied if applicants from different groups are denied at the same rate. A violation of this measure is defined as the difference in denial rate between a target demographic group and the reference demographic group. For example, a statistical parity value of 10 for Black applicants means Black applicants are 10 percentage points more likely to be denied on their loan application than White applicants. Negative values indicate a lower denial rate relative to the reference group.',
  'Predictive Parity': 'Difference in default rates. Predictive parity is satisfied if borrowers from different groups default at the same rate. A violation of this measure is defined as the difference in default rate between a target demographic group and the reference demographic group. For example, a predictive parity value of 10 for Black borrowers means that Black borrowers are 10 percentage points more likely to default than White borrowers. Negative values indicate a lower default rate relative to the reference group.',
  'Marginal Candidates': 'Difference in lending standards. The marginal outcome test is satisfied if borrowers at the margin default at the same rate across groups. Marginal applicants are defined as those who submit one application resulting in an approval and another resulting in a denial. A violation of this measure is defined as the difference in default rate between marginal applicants in the reference demographic group and marginal applicants in a target demographic group. For example, a value of 10 for Black borrowers means that Black marginal borrowers are 10 percentage points less likely to default than White marginal borrowers. This is because lower default rates at the margin imply higher lending standards among this group, relative to the reference group.',
  'Equality of Opportunity': 'Difference in denial rates for creditworthy borrowers; captures a notion of unfair denials. Equality of opportunity is satisfied if creditworthy borrowers are denied at the same rate across groups. A violation of this measure is defined as the difference in denial probability between creditworthy applicants in a target demographic group and creditworthy applicants in the reference demographic group. We define creditworthy applicants as those that did not default on their loan. To estimate this measure, we use the set of applicants who apply multiple times, originate one loan, and do not default. For example, a value of 10 for Black borrowers means that Black creditworthy borrowers are 10 percentage points more likely to be denied on their loan applications than White creditworthy borrowers.',
  'Equality of Goodwill': 'Difference in denial rates for non-creditworthy borrowers, captures a notion of unfair approvals. Equality of goodwill is satisfied if non-creditworthy borrowers are denied at the same rate across groups. A violation of this measure is defined as the difference in denial probability between non-creditworthy applicants in a target demographic group and non-creditworthy applicants in the reference demographic group. We define non-creditworthy borrowers as those that defaulted on their loan. To estimate this measure, we use the set of applicants who apply multiple times, originate one loan, and later default. For example, a value of 10 for Black borrowers means that Black non-creditworthy borrowers are 10 percentage points more likely to be denied on their loan applications than White non-creditworthy borrowers.',
  'Conditional Statistical Parity - Small': 'Conditional difference in denial rates. Conditional statistical parity is satisfied if applicants from different groups, conditional on the same attributes, are denied at the same rate. A violation of this measure is defined as the difference in denial rates between a target and the reference demographic group among those with the same attributes. For example, a value of 10 for Black applicants means that Black applicants are 10 percentage points more likely to be denied on their loan application than White applicants with the same set of attributes (e.g., credit score or loan amount). This "Small model" version is a linear model and includes the conditioning variables: applicant income, loan amount, loan purpose, and an indicator for whether a coapplicant is present.',
  'Conditional Statistical Parity - Large': 'Conditional difference in denial rates. Conditional statistical parity is satisfied if applicants from different groups, conditional on the same attributes, are denied at the same rate. A violation of this measure is defined as the difference in denial rates between a target and the reference demographic group among those with the same attributes. For example, a value of 10 for Black applicants means that Black applicants are 10 percentage points more likely to be denied on their loan application than White applicants with the same set of attributes (e.g., credit score or loan amount). This "Large model" version includes an indicator for whether a coapplicant is present, loan purpose, the outcome of the automated underwriting system, and binned variables: applicant income, loan amount, credit score, debt-to-income ratio, and loan-to-value ratio.',
  'Representativeness': 'Amount of under-representation among those approved; corresponds to the idea that approved applicants should be "representative" of qualified applicants. This measure is satisfied if the proportion of approved applicants from a group is equal to the proportion of qualified applicants from that group. We define qualified applicants as those who have low estimated default risk. A violation of this measure is the difference in the proportion of qualified applicants from a target demographic group and the proportion of approved applicants from the same demographic group. For example, a value of 10 for Black applicants means that there are 10 percentage points fewer Black approved applicants than Black qualified applicants. Thus, if representativeness is positive, the group is "under-represented."'
};

// Color scheme for fairness measures (time series/categories)
export const MEASURE_COLORS = [
  '#e60049', '#0bb4ff', '#50e991', '#e6d800', '#9b19f5',
  '#ffa300', '#dc0ab4', '#b3d4ff', '#00bfa0'
];

// Color scheme for map (diverging scale)
export const MAP_COLORS = [
  '#084D49', '#115653', '#1B605D', '#256A67', '#237877', '#1E8788', '#19969A',
  '#2BA2A7', '#47AFB2', '#64BBBE', '#7EB7BD', '#96A5AF', '#AF92A2', '#BC7E93',
  '#B46982', '#AC5371', '#A43E62', '#992957', '#8E144C', '#830042'
];

// Color scheme for demographic groups (consistent mapping)
export const DEMOGRAPHIC_GROUP_COLORS = {
  'White': '#95A5A6',
  'Black': '#E74C3C',
  'Hispanic': '#3498DB',
  'Asian': '#F39C12',
  'Native American': '#9B59B6',
  'Male': '#34495E',
  'Female': '#E91E63',
  'Two or More Minority Races': '#16A085',
  'Other': '#95A5A6'
};

// Hex tile coordinates for US states (based on NPR hex tile map)
// Source: https://team.carto.com/u/andrew/tables/andrew.us_states_hexgrid/public/map
export const HEX_COORDS = {
  'AK': { col: 0, row: 0 },
  'ME': { col: 11, row: 0 },
  'VT': { col: 10, row: 1 },
  'NH': { col: 11, row: 1 },
  'WA': { col: 0, row: 2 },
  'MT': { col: 2, row: 2 },
  'ND': { col: 3, row: 2 },
  'MN': { col: 4, row: 2 },
  'WI': { col: 5, row: 2 },
  'MI': { col: 7, row: 2 },
  'NY': { col: 9, row: 2 },
  'MA': { col: 10, row: 2 },
  'RI': { col: 11, row: 2 },
  'ID': { col: 1, row: 3 },
  'WY': { col: 2, row: 3 },
  'SD': { col: 3, row: 3 },
  'IA': { col: 4, row: 3 },
  'IL': { col: 5, row: 3 },
  'IN': { col: 6, row: 3 },
  'OH': { col: 7, row: 3 },
  'PA': { col: 8, row: 3 },
  'NJ': { col: 9, row: 3 },
  'CT': { col: 10, row: 3 },
  'DE': { col: 11, row: 3 },
  'OR': { col: 0, row: 4 },
  'NV': { col: 1, row: 4 },
  'CO': { col: 3, row: 4 },
  'NE': { col: 4, row: 4 },
  'MO': { col: 5, row: 4 },
  'KY': { col: 6, row: 4 },
  'WV': { col: 7, row: 4 },
  'MD': { col: 9, row: 4 },
  'VA': { col: 8, row: 4 },
  'CA': { col: 0, row: 5 },
  'UT': { col: 2, row: 5 },
  'AZ': { col: 2, row: 6 },
  'NM': { col: 3, row: 6 },
  'KS': { col: 4, row: 5 },
  'AR': { col: 5, row: 5 },
  'TN': { col: 6, row: 5 },
  'NC': { col: 7, row: 5 },
  'SC': { col: 8, row: 5 },
  'OK': { col: 4, row: 6 },
  'LA': { col: 5, row: 6 },
  'MS': { col: 6, row: 6 },
  'AL': { col: 7, row: 6 },
  'GA': { col: 8, row: 6 },
  'HI': { col: 0, row: 7 },
  'TX': { col: 4, row: 7 },
  'FL': { col: 9, row: 7 }
};
