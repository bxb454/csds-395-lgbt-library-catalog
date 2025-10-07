# CAS Authentication CLI Testing - Quick Start Guide

## 🚀 Ready to Test!

Your CAS authentication system is now ready for CLI testing with proper username/password credentials.

## 📁 What Was Created

1. **`test_cas_cli.go`** - Full-featured CLI testing tool that handles the complete CAS authentication flow
2. **`simple_test.go`** - Simple endpoint tester for quick checks
3. **`test_cas.ps1`** - Automated PowerShell test script
4. **`test_cas.bat`** - Automated batch file test script
5. **`README.md`** - Complete documentation in the cas/ directory

## 🎯 How to Test (3 Easy Options)

### Option 1: Automated Testing (Easiest)
```powershell
cd backend
.\test_cas.ps1
```
This will automatically start the server and run the full test suite.

### Option 2: Manual Testing with Real Credentials
```powershell
# Terminal 1: Start the server
cd backend
go run main.go

# Terminal 2: Run the CLI tester
cd backend
go run cas\test_cas_cli.go
```
Enter your CWRU username and password when prompted.

### Option 3: Quick Endpoint Testing
```powershell
# Terminal 1: Start the server
go run main.go

# Terminal 2: Test individual endpoints
go run cas\simple_test.go /healthz    # Should return "ok"
go run cas\simple_test.go /           # Should redirect to CAS login
go run cas\simple_test.go /logout     # Should redirect to CAS logout
```

## 🔍 What the CLI Tester Does

1. **Checks if server is running** on localhost:8080
2. **Prompts for CWRU credentials** (password hidden for security)
3. **Simulates browser flow:**
   - Accesses protected endpoint
   - Gets redirected to CAS login
   - Submits credentials automatically
   - Follows redirect back to your app
   - Displays the authenticated response
4. **Tests additional endpoints** like /healthz and /logout
5. **Reports success/failure** with detailed output

## ✅ Expected Success Output

```
CAS Authentication CLI Tester
=============================
✅ Server is running
Enter CWRU username: your_username
Enter CWRU password: ********

Starting CAS authentication test...
Step 1: Accessing protected resource...
Redirected to CAS login: https://login.case.edu/cas/login?service=...
Step 2: Parsing login form...
Step 3: Submitting credentials...
Step 4: Following redirect back to service...
Final response status: 200 OK
Final response body: hello, your_username

✅ Authentication successful!
✅ All tests completed!
```

## 🛠 Troubleshooting

- **Server not running**: Make sure `go run main.go` is running first
- **Authentication failed**: Verify your CWRU credentials
- **Network issues**: Check internet connection and access to login.case.edu
- **Port conflicts**: Ensure port 8080 is available

## 🔒 Security Notes

- Passwords are entered securely (hidden input)
- No credentials are stored or logged
- Uses secure HTTPS for CAS communication
- Session cookies are handled automatically

You're all set! Run the tests with your real CWRU credentials to verify the authentication system works properly.