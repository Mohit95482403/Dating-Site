// Profile Input Validation Rules with adult age verification, XSS sanitization, and strict preference checks

/**
 * Helper to check for dangerous HTML or script injection
 */
const containsHtml = (val: string): boolean => /<[^>]*>/i.test(val);

/**
 * Helper to calculate age from DOB
 */
export const calculateAgeFromDob = (dobStr: string): number | null => {
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? age : null;
};

/**
 * Validate PUT /api/profile partial update payload
 */
export const validateProfileUpdateInput = (data: any): string[] | null => {
  const errors: string[] = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return ['Invalid request body. JSON object expected.'];
  }

  const {
    firstName,
    lastName,
    dateOfBirth,
    gender,
    bio,
    occupation,
    education,
    city,
    state,
    country,
    interests,
    preferences,
  } = data;

  // 1. firstName (if provided)
  if (firstName !== undefined) {
    if (typeof firstName !== 'string' || firstName.trim().length === 0) {
      errors.push('First name cannot be empty or whitespace only.');
    } else if (firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters.');
    } else if (firstName.trim().length > 50) {
      errors.push('First name cannot exceed 50 characters.');
    } else if (containsHtml(firstName)) {
      errors.push('First name contains invalid characters or HTML tags.');
    }
  }

  // 2. lastName (if provided)
  if (lastName !== undefined && lastName !== null) {
    if (typeof lastName !== 'string') {
      errors.push('Last name must be a string.');
    } else if (lastName.trim().length > 50) {
      errors.push('Last name cannot exceed 50 characters.');
    } else if (containsHtml(lastName)) {
      errors.push('Last name contains invalid characters or HTML tags.');
    }
  }

  // 3. dateOfBirth (if provided)
  if (dateOfBirth !== undefined && dateOfBirth !== null) {
    if (typeof dateOfBirth !== 'string') {
      errors.push('Date of birth must be a date string (YYYY-MM-DD).');
    } else {
      const age = calculateAgeFromDob(dateOfBirth);
      if (age === null) {
        errors.push('Date of birth must be a valid date format (YYYY-MM-DD).');
      } else {
        const inputDate = new Date(dateOfBirth);
        const today = new Date();
        if (inputDate > today) {
          errors.push('Date of birth cannot be in the future.');
        } else if (age < 18) {
          errors.push('You must be at least 18 years old to use Connectly.');
        } else if (age > 120) {
          errors.push('Please enter a realistic date of birth.');
        }
      }
    }
  }

  // 4. gender (if provided)
  if (gender !== undefined && gender !== null) {
    const validGenders = ['male', 'female', 'non_binary', 'other'];
    if (typeof gender !== 'string' || !validGenders.includes(gender.toLowerCase())) {
      errors.push(`Gender must be one of: ${validGenders.join(', ')}.`);
    }
  }

  // 5. bio (if provided)
  if (bio !== undefined && bio !== null) {
    if (typeof bio !== 'string') {
      errors.push('Bio must be a string.');
    } else if (bio.trim().length > 0 && bio.trim().length < 10) {
      errors.push('Bio must be at least 10 characters if provided.');
    } else if (bio.length > 1000) {
      errors.push('Bio cannot exceed 1000 characters.');
    } else if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(bio)) {
      errors.push('Bio contains prohibited script tags.');
    }
  }

  // 6. occupation (if provided)
  if (occupation !== undefined && occupation !== null) {
    if (typeof occupation !== 'string') {
      errors.push('Occupation must be a string.');
    } else if (occupation.trim().length > 150) {
      errors.push('Occupation cannot exceed 150 characters.');
    } else if (containsHtml(occupation)) {
      errors.push('Occupation contains invalid HTML tags.');
    }
  }

  // 7. education (if provided)
  if (education !== undefined && education !== null) {
    if (typeof education !== 'string') {
      errors.push('Education must be a string.');
    } else if (education.trim().length > 150) {
      errors.push('Education cannot exceed 150 characters.');
    } else if (containsHtml(education)) {
      errors.push('Education contains invalid HTML tags.');
    }
  }

  // 8. location: city, state, country (if provided)
  if (city !== undefined && city !== null) {
    if (typeof city !== 'string' || city.trim().length === 0) {
      errors.push('City cannot be empty or whitespace only.');
    } else if (city.trim().length > 100) {
      errors.push('City cannot exceed 100 characters.');
    } else if (containsHtml(city)) {
      errors.push('City contains invalid characters or HTML tags.');
    }
  }

  if (state !== undefined && state !== null) {
    if (typeof state !== 'string') {
      errors.push('State must be a string.');
    } else if (state.trim().length > 100) {
      errors.push('State cannot exceed 100 characters.');
    } else if (containsHtml(state)) {
      errors.push('State contains invalid characters or HTML tags.');
    }
  }

  if (country !== undefined && country !== null) {
    if (typeof country !== 'string' || country.trim().length === 0) {
      errors.push('Country cannot be empty or whitespace only.');
    } else if (country.trim().length > 100) {
      errors.push('Country cannot exceed 100 characters.');
    } else if (containsHtml(country)) {
      errors.push('Country contains invalid characters or HTML tags.');
    }
  }

  // 9. interests (if provided)
  if (interests !== undefined && interests !== null) {
    if (!Array.isArray(interests)) {
      errors.push('Interests must be an array of positive integer IDs.');
    } else {
      if (interests.length > 15) {
        errors.push('You can select a maximum of 15 interests.');
      }
      for (const id of interests) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
          errors.push('Each interest ID must be a positive integer.');
          break;
        }
      }
    }
  }

  // 10. preferences (if provided)
  if (preferences !== undefined && preferences !== null) {
    if (typeof preferences !== 'object' || Array.isArray(preferences)) {
      errors.push('Preferences must be an object.');
    } else {
      const { minAge, maxAge, preferredGender, maxDistanceKm, relationshipGoal } = preferences;

      if (minAge !== undefined) {
        if (typeof minAge !== 'number' || !Number.isInteger(minAge) || minAge < 18 || minAge > 100) {
          errors.push('Preferences minAge must be an integer between 18 and 100.');
        }
      }

      if (maxAge !== undefined) {
        if (typeof maxAge !== 'number' || !Number.isInteger(maxAge) || maxAge < 18 || maxAge > 100) {
          errors.push('Preferences maxAge must be an integer between 18 and 100.');
        }
      }

      if (
        typeof minAge === 'number' &&
        typeof maxAge === 'number' &&
        minAge > maxAge
      ) {
        errors.push('Preferences minAge cannot be greater than maxAge.');
      }

      if (preferredGender !== undefined) {
        const validPreferredGenders = ['all', 'male', 'female', 'non_binary', 'other'];
        if (
          typeof preferredGender !== 'string' ||
          !validPreferredGenders.includes(preferredGender.toLowerCase())
        ) {
          errors.push(
            `Preferences preferredGender must be one of: ${validPreferredGenders.join(', ')}.`
          );
        }
      }

      if (maxDistanceKm !== undefined) {
        if (
          typeof maxDistanceKm !== 'number' ||
          !Number.isInteger(maxDistanceKm) ||
          maxDistanceKm <= 0 ||
          maxDistanceKm > 500
        ) {
          errors.push('Preferences maxDistanceKm must be a positive integer between 1 and 500.');
        }
      }

      if (relationshipGoal !== undefined) {
        const validGoals = ['dating', 'long_term', 'friendship', 'casual', 'marriage', 'not_sure'];
        if (
          typeof relationshipGoal !== 'string' ||
          !validGoals.includes(relationshipGoal.toLowerCase())
        ) {
          errors.push(`Preferences relationshipGoal must be one of: ${validGoals.join(', ')}.`);
        }
      }
    }
  }

  return errors.length > 0 ? errors : null;
};
