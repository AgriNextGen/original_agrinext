Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class CredManager {
    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);
    
    [DllImport("advapi32.dll", EntryPoint = "CredFree")]
    public static extern void CredFree(IntPtr buffer);
    
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public uint Flags;
        public uint Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist;
        public uint AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }
    
    public static string GetCredential(string target) {
        IntPtr credPtr;
        if (!CredRead(target, 1, 0, out credPtr)) {
            return "ERROR: " + new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error()).Message;
        }
        try {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            if (cred.CredentialBlobSize == 0) return "EMPTY";
            byte[] blobBytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, blobBytes, 0, (int)cred.CredentialBlobSize);
            // Try both UTF-16LE and UTF-8
            string utf16 = Encoding.Unicode.GetString(blobBytes);
            string utf8 = Encoding.UTF8.GetString(blobBytes);
            return "UTF16: " + utf16 + " | UTF8: " + utf8;
        } finally {
            CredFree(credPtr);
        }
    }
}
"@

$token = [CredManager]::GetCredential("Supabase CLI:supabase")
Write-Host "Result: $token"
