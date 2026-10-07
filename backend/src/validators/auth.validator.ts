// Authentication input validators with adult age verification and password policy

export const validateRegisterInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { email, password, firstName, lastName, dateOfBirth, gender } = data || {};

  // 1. Email validation
  if (!email || typeof email !== 'string') {
    errors.push('A valid email address is required.');
  } else {
    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.push('Email address format is invalid.');
    }
  }

  // 2. Strong Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required.');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&* etc.).');
    }
  }

  // 3. First Name
  if (!firstName || typeof firstName !== 'string' || firstName.trim().length < 2) {
    errors.push('First name is required and must be at least 2 characters.');
  } else if (firstName.trim().length > 50) {
    errors.push('First name cannot exceed 50 characters.');
  }

  // 4. Last Name (optional)
  if (lastName && (typeof lastName !== 'string' || lastName.trim().length > 50)) {
    errors.push('Last name cannot exceed 50 characters.');
  }

  // 5. Date of Birth & Age validation (Must be 18+)
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

  // 6. Gender validation
  const validGenders = ['male', 'female', 'non_binary', 'other'];
  if (!gender || typeof gender !== 'string' || !validGenders.includes(gender.toLowerCase())) {
    errors.push(`Gender is required and must be one of: ${validGenders.join(', ')}.`);
  }

  return errors.length > 0 ? errors : null;
};

export const validateLoginInput = (data: any): string[] | null => {
  const errors: string[] = [];
  const { email, password } = data || {};

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('Email address format is invalid.');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required.');
  }

  return errors.length > 0 ? errors : null;
};
