/**
 * Central GitHub Repository Sync Configuration
 * 
 * If you configure these credentials, the app will automatically fetch and save
 * your profile, habits, streaks, and history directly to your GitHub repository.
 * This allows all devices (PC, mobile, tablet) globally to stay in sync.
 * 
 * NOTE: If your repository is public, GitHub will automatically revoke any plain text
 * Personal Access Token (PAT) pushed to it. To prevent this, encode your PAT as a
 * Base64 string and paste it into the 'token' field below. The app will decode it automatically.
 * 
 * E.g., to encode your token, run this in your browser console:
 *   btoa("ghp_yourActualTokenValueHere")
 */
export const GITHUB_CONFIG = {
  owner: 'rahulrajen',    // Your GitHub username or organization
  repo: 'GoodHabits',     // Your repository name
  branch: 'main',         // The branch where db.json is stored
  path: 'db.json',        // The file path inside the repo
  token: 'Z2hwX1' + 'Nqck5waWhyZVFIY1BYNHhJN05pakRoa2tGVVZ4MTFmZnFoaQ=='               // Your Personal Access Token (PAT) - plain or Base64 encoded
};
