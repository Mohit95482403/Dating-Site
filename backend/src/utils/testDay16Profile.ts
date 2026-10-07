export {};

const API_BASE = 'http://127.0.0.1:5000/api';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, message: string): void {
  results.push({ name, passed, message });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] ${name}: ${message}`);
}

async function registerAndOnboardUser(
  firstName: string,
  gender: 'male' | 'female',
  preferredGender: 'male' | 'female'
): Promise<{ id: number; token: string; email: string }> {
  const ts = Date.now() + Math.floor(Math.random() * 100000);
  const email = `day16_${firstName.toLowerCase()}_${ts}@example.com`;
  const password = 'StrongPassword123!';

  // 1. Register
  const regRes = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      firstName,
      lastName: 'Day16Tester',
      dateOfBirth: '1997-08-20',
      gender,
    }),
  });
  const regData = (await regRes.json()) as any;
  const id = regData?.data?.user?.id;
  const token = regData?.data?.accessToken;

  if (!token || !id) {
    throw new Error(`Failed to register user ${firstName}: ${JSON.stringify(regData)}`);
  }

  // 2. Onboard about
  await fetch(`${API_BASE}/onboarding/about`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      bio: `Hi there! I am ${firstName} exploring Connectly Day 16 profiles.`,
      occupation: 'Software Engineer',
      city: 'Mumbai',
      country: 'India',
    }),
  });

  // 3. Onboard interests
  await fetch(`${API_BASE}/onboarding/interests`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      interestIds: [1, 2, 3],
    }),
  });

  // 4. Onboard preferences
  await fetch(`${API_BASE}/onboarding/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      minAge: 20,
      maxAge: 35,
      preferredGender,
      maxDistanceKm: 40,
      relationshipGoal: 'dating',
    }),
  });

  return { id, token, email };
}

async function runDay16Tests() {
  console.log('\n================================================================');
  console.log('   CONNECTLY — DAY 16 AUTOMATED ACCEPTANCE TEST SUITE');
  console.log('   ADVANCED PROFILES, MEDIA GALLERY, COMPLETION & VERIFICATION');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // SETUP: Create User A and User B
    // -------------------------------------------------------------
    console.log('--- Step 0: User Setup ---');
    const userA = await registerAndOnboardUser('Aria', 'female', 'male');
    const userB = await registerAndOnboardUser('Liam', 'male', 'female');
    record('User Setup', true, `Created User A (ID: ${userA.id}) and User B (ID: ${userB.id})`);

    // -------------------------------------------------------------
    // TEST 1: Own Profile Retrieval with Day 16 additions
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Own Profile Retrieval ---');
    const profResA = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const profDataA = (await profResA.json()) as any;
    const profileA = profDataA?.data?.profile;

    const hasPromptsArray = Array.isArray(profileA?.prompts);
    const hasVerificationStatus = profileA?.verificationStatus !== undefined;
    const hasCompletion = profileA?.completion !== undefined;

    record(
      'Own Profile Fields',
      profResA.status === 200 && hasPromptsArray && hasVerificationStatus && hasCompletion,
      `Profile loaded with prompts (${profileA?.prompts?.length}), status: ${profileA?.verificationStatus}, completion: ${profileA?.completionPercentage}%`
    );

    // -------------------------------------------------------------
    // TEST 2: Photo Management (Add, Reorder, Primary, Delete Protection)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: Photo Management & Limits ---');
    // Add photo 1
    const addPhoto1Res = await fetch(`${API_BASE}/profile/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        fileUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        fileName: 'aria_1.jpg',
        isPrimary: true,
      }),
    });
    const addPhoto1Data = (await addPhoto1Res.json()) as any;
    const photo1 = addPhoto1Data?.data?.photo;
    record('Add First Photo', addPhoto1Res.status === 201 && Boolean(photo1?.id), `Photo 1 ID: ${photo1?.id}`);

    // Add photo 2
    const addPhoto2Res = await fetch(`${API_BASE}/profile/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        fileUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
        fileName: 'aria_2.jpg',
        isPrimary: false,
      }),
    });
    const addPhoto2Data = (await addPhoto2Res.json()) as any;
    const photo2 = addPhoto2Data?.data?.photo;
    record('Add Second Photo', addPhoto2Res.status === 201 && Boolean(photo2?.id), `Photo 2 ID: ${photo2?.id}`);

    // Reorder photos
    const reorderRes = await fetch(`${API_BASE}/profile/photos/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        photoIds: [photo2.id, photo1.id],
      }),
    });
    const reorderData = (await reorderRes.json()) as any;
    const reorderedPhotos = reorderData?.data?.photos || [];
    const firstReordered = reorderedPhotos[0];
    record(
      'Photo Reordering',
      reorderRes.status === 200 && firstReordered?.id === photo2.id,
      `Photo ${firstReordered?.id} is now primary at display_order: ${firstReordered?.displayOrder}`
    );

    // Set Primary Photo explicitly
    const primaryRes = await fetch(`${API_BASE}/profile/photos/${photo1.id}/primary`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const primaryData = (await primaryRes.json()) as any;
    record(
      'Set Primary Photo',
      primaryRes.status === 200 && primaryData?.data?.primaryPhotoId === photo1.id,
      `Primary photo successfully switched back to ID: ${photo1.id}`
    );

    // IDOR Protection: User B attempts to delete User A's photo
    const idorRes = await fetch(`${API_BASE}/profile/photos/${photo1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userB.token}` },
    });
    record(
      'IDOR Protection on Photos',
      idorRes.status === 404 || idorRes.status === 403,
      `User B deleting User A photo returned HTTP ${idorRes.status}`
    );

    // Delete photo 2 (safe delete when 2 photos exist)
    const deletePhoto2Res = await fetch(`${API_BASE}/profile/photos/${photo2.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    record('Delete Non-Sole Photo', deletePhoto2Res.status === 200, `Successfully deleted photo ${photo2.id}`);

    // Photo Delete Protection: Attempt to delete the sole remaining photo
    const deleteSolePhotoRes = await fetch(`${API_BASE}/profile/photos/${photo1.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const deleteSoleData = (await deleteSolePhotoRes.json()) as any;
    const preventsSoleDelete =
      deleteSolePhotoRes.status === 400 &&
      deleteSoleData?.message?.includes('at least one profile photo');
    record(
      'Photo Delete Protection',
      preventsSoleDelete,
      `Sole photo deletion blocked with message: "${deleteSoleData?.message}"`
    );

    // -------------------------------------------------------------
    // TEST 3: Profile Prompts System
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Profile Prompts System ---');
    // List available prompts
    const promptsListRes = await fetch(`${API_BASE}/profile/prompts`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const promptsListData = (await promptsListRes.json()) as any;
    const allPrompts = promptsListData?.data?.prompts || [];
    record(
      'Predefined Prompts Seeded',
      promptsListRes.status === 200 && allPrompts.length >= 10,
      `Found ${allPrompts.length} predefined prompts available in MySQL`
    );

    const targetPrompt = allPrompts[0];

    // Save prompt answer
    const savePromptRes = await fetch(`${API_BASE}/profile/user-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        promptId: targetPrompt.id,
        answer: 'Exploring quiet coffee shops with a good book and matcha latte.',
      }),
    });
    const savePromptData = (await savePromptRes.json()) as any;
    const userPromptsList = savePromptData?.data?.prompts || [];
    const savedPrompt = userPromptsList.find((p: any) => p.promptId === targetPrompt.id);
    record(
      'Save User Prompt',
      savePromptRes.status === 200 && Boolean(savedPrompt),
      `Answer saved for "${targetPrompt.promptText}": "${savedPrompt?.answer}"`
    );

    // Prompt answer length validation (> 300 characters should fail)
    const longAnswer = 'A'.repeat(305);
    const longAnswerRes = await fetch(`${API_BASE}/profile/user-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        promptId: targetPrompt.id,
        answer: longAnswer,
      }),
    });
    record(
      'Prompt Answer Length Validation',
      longAnswerRes.status === 400,
      `Prompt answer with 305 characters rejected with HTTP ${longAnswerRes.status}`
    );

    // -------------------------------------------------------------
    // TEST 4: Profile Completion Breakdown
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Profile Completion Calculation ---');
    const compRes = await fetch(`${API_BASE}/profile/completion`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const compData = (await compRes.json()) as any;
    const compResult = compData?.data;

    const hasPercentage = typeof compResult?.percentage === 'number';
    const hasCompletedList = Array.isArray(compResult?.completed);
    const hasMissingList = Array.isArray(compResult?.missing);

    record(
      'Profile Completion Breakdown',
      compRes.status === 200 && hasPercentage && hasCompletedList && hasMissingList,
      `Calculated: ${compResult?.percentage}%, Completed: [${compResult?.completed?.join(', ')}], Missing: [${compResult?.missing?.join(', ')}]`
    );

    // -------------------------------------------------------------
    // TEST 5: Public Profile Viewing, Privacy & Sanitization
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Public Profile Viewing & Privacy ---');
    // User A views User B's public profile
    const pubRes = await fetch(`${API_BASE}/profile/${userB.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const pubData = (await pubRes.json()) as any;
    const pubProfile = pubData?.data?.profile;

    const isSanitized =
      pubProfile?.password_hash === undefined &&
      pubProfile?.email === undefined &&
      pubProfile?.userId === userB.id;

    record(
      'Public Profile Sanitization',
      pubRes.status === 200 && isSanitized,
      `Safe public profile returned: firstName="${pubProfile?.firstName}", age=${pubProfile?.age}, email/hash masked`
    );

    // Day 15 Privacy Settings Test: User B hides profile visibility
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({
        profileVisibility: 'hidden',
      }),
    });

    // User A attempts to view hidden User B profile
    const hiddenRes = await fetch(`${API_BASE}/profile/${userB.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    record(
      'Privacy Enforcement (Hidden Profile)',
      hiddenRes.status === 404,
      `Hidden profile returned HTTP ${hiddenRes.status} (Not Found)`
    );

    // Restore User B profile visibility
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userB.token}` },
      body: JSON.stringify({
        profileVisibility: 'public',
      }),
    });

    // Day 15 Block Test: User A blocks User B
    await fetch(`${API_BASE}/blocks/${userB.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({ reason: 'Testing profile block' }),
    });

    // Blocked profile viewing check
    const blockedRes = await fetch(`${API_BASE}/profile/${userB.id}`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    record(
      'Blocking Enforcement on Profile',
      blockedRes.status === 404,
      `Viewing blocked user profile blocked with HTTP ${blockedRes.status}`
    );

    // Unblock for remaining tests
    await fetch(`${API_BASE}/blocks/${userB.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userA.token}` },
    });

    // -------------------------------------------------------------
    // TEST 6: Profile Reporting System
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Profile Reporting ---');
    // User A reports User B
    const reportRes = await fetch(`${API_BASE}/reports/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        reportedUserId: userB.id,
        reason: 'Harassment',
        description: 'Sent inappropriate content during test run.',
      }),
    });
    const reportData = (await reportRes.json()) as any;
    record(
      'Submit Profile Report',
      reportRes.status === 201 && Boolean(reportData?.data?.reportId),
      `Report submitted with ID: ${reportData?.data?.reportId}`
    );

    // Self-reporting prevention
    const selfReportRes = await fetch(`${API_BASE}/reports/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        reportedUserId: userA.id,
        reason: 'Harassment',
      }),
    });
    record(
      'Self-Reporting Blocked',
      selfReportRes.status === 400,
      `Self-reporting rejected with HTTP ${selfReportRes.status}`
    );

    // -------------------------------------------------------------
    // TEST 7: Verification Foundation & Secure Document Storage
    // -------------------------------------------------------------
    console.log('\n--- Test 7: Verification Foundation ---');
    // Check initial verification status
    const verInitRes = await fetch(`${API_BASE}/profile/verification`, {
      headers: { Authorization: `Bearer ${userA.token}` },
    });
    const verInitData = (await verInitRes.json()) as any;
    record(
      'Initial Verification Status',
      verInitRes.status === 200 && verInitData?.data?.status === 'not_verified',
      `Initial status: ${verInitData?.data?.status}, isVerified: ${verInitData?.data?.isVerified}`
    );

    // Submit verification document
    const submitVerRes = await fetch(`${API_BASE}/profile/verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userA.token}` },
      body: JSON.stringify({
        fileUrl: `/uploads/verifications/user-${userA.id}/id_document_test.jpg`,
      }),
    });
    const submitVerData = (await submitVerRes.json()) as any;
    record(
      'Submit Verification Request',
      submitVerRes.status === 201 && submitVerData?.data?.status === 'pending',
      `Verification status transitioned to: ${submitVerData?.data?.status}`
    );

    // Verification file protection: Non-authenticated / foreign user access blocked
    const foreignDocRes = await fetch(
      `http://127.0.0.1:5000/uploads/verifications/user-${userA.id}/id_document_test.jpg`,
      {
        headers: { Authorization: `Bearer ${userB.token}` },
      }
    );
    record(
      'Verification Document Protection',
      foreignDocRes.status === 403,
      `Foreign user attempting to view private verification doc received HTTP ${foreignDocRes.status} (Forbidden)`
    );

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('   DAY 16 TEST SUITE RESULTS SUMMARY');
    console.log('================================================================');
    const passedCount = results.filter((r) => r.passed).length;
    const totalCount = results.length;
    console.log(`Total Tests: ${totalCount} | Passed: ${passedCount} | Failed: ${totalCount - passedCount}`);

    if (passedCount === totalCount) {
      console.log('\n🎉 ALL DAY 16 ACCEPTANCE CRITERIA PASSED SUCCESSFULLY!\n');
    } else {
      console.error('\n❌ SOME DAY 16 ACCEPTANCE TESTS FAILED.\n');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test execution error:', err);
    process.exit(1);
  }
}

runDay16Tests();
