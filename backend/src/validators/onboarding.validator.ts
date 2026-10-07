// Onboarding Input Validation Rules with adult age verification and strict sanitation

export const validateBasicInfoInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { firstName, lastName, dateOfBirth, gender } = data || {};

  // First name
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters.');
  } else if (firstName.trim().length > 50) {
    errors.push('First name cannot exceed 50 characters.');
  }

  // Last name (optional)
  if (lastName && (typeof lastName !== 'string' || lastName.trim().length > 50)) {
    errors.push('Last name cannot exceed 50 characters.');
  }

  // Date of Birth & Age validation (18+)
  if (!dateOfBirth || typeof dateOfBirth !== 'string') {
    errors.push('Date of birth is required.');
  } else {
    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      errors.push('Date of birth must be a valid date format (YYYY-MM-DD).');
    } else {
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }

      if (age < 18) {
        errors.push('You must be at least 18 years old to join Connectly.');
      } else if (age > 120) {
        errors.push('Please enter a realistic date of birth.');
      }
    }
  }

  // Gender
  const validGenders = ['male', 'female', 'non_binary', 'other'];
  if (!gender || typeof gender !== 'string' || !validGenders.includes(gender.toLowerCase())) {
    errors.push(`Gender is required and must be one of: ${validGenders.join(', ')}.`);
  }

  return errors.length > 0 ? errors : null;
};

export const validateAboutInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { bio, occupation, education, city, state, country } = data || {};

  // Bio
  if (!bio || typeof bio !== 'string' || bio.trim().length < 10) {
    errors.push('Bio is required and must be at least 10 characters.');
  } else if (bio.trim().length > 500) {
    errors.push('Bio cannot exceed 500 characters.');
  }

  // Occupation (optional)
  if (occupation && (typeof occupation !== 'string' || occupation.trim().length > 150)) {
    errors.push('Occupation cannot exceed 150 characters.');
  }

  // Education (optional)
  if (education && (typeof education !== 'string' || education.trim().length > 150)) {
    errors.push('Education cannot exceed 150 characters.');
  }

  // City (required)
  if (!city || typeof city !== 'string' || city.trim().length < 2) {
    errors.push('City is required and must be at least 2 characters.');
  } else if (city.trim().length > 100) {
    errors.push('City cannot exceed 100 characters.');
  }

  // State (optional)
  if (state && (typeof state !== 'string' || state.trim().length > 100)) {
    errors.push('State cannot exceed 100 characters.');
  }

  // Country (required)
  if (!country || typeof country !== 'string' || country.trim().length < 2) {
    errors.push('Country is required and must be at least 2 characters.');
  } else if (country.trim().length > 100) {
    errors.push('Country cannot exceed 100 characters.');
  }

  return errors.length > 0 ? errors : null;
};

export const validateInterestsInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { interestIds } = data || {};

  if (!Array.isArray(interestIds)) {
    errors.push('interestIds must be an array of interest IDs.');
    return errors;
  }

  if (interestIds.length < 3) {
    errors.push('Please select at least 3 interests to help match your vibe.');
  } else if (interestIds.length > 10) {
    errors.push('You can select a maximum of 10 interests.');
  }

  // Check that all elements are positive numbers
  for (const id of interestIds) {
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      errors.push('Each interest ID must be a positive integer.');
      break;
    }
  }

  return errors.length > 0 ? errors : null;
};

export const validatePreferencesInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { minAge, maxAge, preferredGender, maxDistanceKm, relationshipGoal } = data || {};

  // Age range
  if (typeof minAge !== 'number' || minAge < 18 || minAge > 100) {
    errors.push('Minimum age must be between 18 and 100.');
  }
  if (typeof maxAge !== 'number' || maxAge < 18 || maxAge > 100) {
    errors.push('Maximum age must be between 18 and 100.');
  }
  if (typeof minAge === 'number' && typeof maxAge === 'number' && minAge > maxAge) {
    errors.push('Minimum age cannot be greater than maximum age.');
  }

  // Preferred gender
  const validPreferredGenders = ['all', 'male', 'female', 'non_binary', 'other'];
  if (!preferredGender || !validPreferredGenders.includes(preferredGender.toLowerCase())) {
    errors.push(`Preferred gender must be one of: ${validPreferredGenders.join(', ')}.`);
  }

  // Max distance
  if (typeof maxDistanceKm !== 'number' || maxDistanceKm <= 0 || maxDistanceKm > 500) {
    errors.push('Maximum distance must be between 1 km and 500 km.');
  }

  // Relationship goal
  const validGoals = ['dating', 'long_term', 'friendship', 'casual', 'marriage', 'not_sure'];
  if (!relationshipGoal || !validGoals.includes(relationshipGoal.toLowerCase())) {
    errors.push(`Relationship goal must be one of: ${validGoals.join(', ')}.`);
  }

  return errors.length > 0 ? errors : null;
};
