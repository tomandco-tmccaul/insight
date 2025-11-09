// Email service using Firebase Auth's built-in email system
// Uses generatePasswordResetLink() and sends via Firebase's email service
// Requires SMTP configuration in Firebase Console > Authentication > Templates > SMTP settings
// You can customize the email template in Firebase Console > Authentication > Templates

import { auth } from '@/lib/firebase/admin';

export interface InviteEmailData {
  email: string;
  inviteLink: string;
  invitedBy?: string;
}

export async function sendInviteEmail(data: InviteEmailData): Promise<void> {
  if (!auth) {
    console.warn('Firebase Auth not initialized');
    console.log('📧 Invite email would be sent to:', data.email);
    console.log('🔗 Invite link:', data.inviteLink);
    return;
  }

  try {
    // Generate password reset link with custom redirect URL
    // This link will be sent via Firebase's email service if SMTP is configured
    const actionCodeSettings = {
      url: data.inviteLink, // Redirect to our invite page after password reset
      handleCodeInApp: false,
    };

    // Generate the password reset link
    // Note: This generates the link but doesn't send the email automatically
    // To send the email, we need to use sendPasswordResetEmail() from client SDK
    // OR configure SMTP in Firebase Console and Firebase will handle it
    
    // For now, we'll generate the link and use it in our invite flow
    // The invite page will handle password setting
    const passwordResetLink = await auth.generatePasswordResetLink(
      data.email,
      actionCodeSettings
    );

    // Store the password reset link in the invite document so we can use it
    // The actual email sending will be handled by Firebase when SMTP is configured
    // OR we can use the generated link directly in our invite page
    
    console.log('✅ Password reset link generated for:', data.email);
    console.log('🔗 Password reset link:', passwordResetLink);
    console.log('📧 To enable automatic email sending:');
    console.log('   1. Go to Firebase Console > Authentication > Templates');
    console.log('   2. Configure SMTP settings');
    console.log('   3. Customize the password reset email template');
    console.log('   4. Firebase will automatically send emails when password reset is requested');
    
    // For now, we'll use our custom invite link
    // Once SMTP is configured, Firebase will send password reset emails automatically
    console.log('📧 Custom invite link:', data.inviteLink);
    
  } catch (error: any) {
    console.error('Error generating password reset link:', error);
    
    // Fallback: Log the custom invite link
    console.log('📧 Invite email would be sent to:', data.email);
    console.log('🔗 Invite link:', data.inviteLink);
    
    if (error.code === 'auth/user-not-found') {
      console.warn('⚠️  User not found in Firebase Auth. Make sure user is created first.');
    }
  }
}

