using System;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Linq;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Diagnostics;
using System.Web.Script.Serialization;
using System.Runtime.InteropServices;

static class Program {
 const string ReleaseBaseUrl="https://dsiqke8d1w5q2zz5.github.io/jijdspwl3115djsjlp/01-crm/";
 static bool PreviewMode;
 static readonly string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"CRM-BuyerHelper");
 static readonly string Settings=Path.Combine(Root,"install-path.txt");
 static readonly HashSet<string> Allowed=new HashSet<string>(new[]{"manifest.json","background.js","bridge.js","popup.html","popup.js","read.js","read591.js","pagination.js","areas.js","match-engine.js","storage.js","acorn.js","ACORN-LICENSE.txt"},StringComparer.Ordinal);
 [STAThread] static int Main(string[] args) {
  if(args.Length==3&&args[0]=="--picker-test"){try{ModernFolderPicker.Test(args[1]);File.WriteAllText(args[2],"PASS native IFileDialog folder mode, filesystem restriction, Unicode path roundtrip and initial folder");return 0;}catch(Exception e){File.WriteAllText(args[2],e.ToString());return 1;}}

  if(args.Length==3&&args[0]=="--install-test"){try{var version=InstallRelease(args[1]);File.WriteAllText(args[2],"PASS real HTTPS download, manifest version, SHA256, extraction and install: "+version);return 0;}catch(Exception e){File.WriteAllText(args[2],e.ToString());return 1;}}

  if(args.Length==4&&args[0]=="--verify-package"){try{var files=ReadPackage(File.ReadAllBytes(args[1]),args[2]);File.WriteAllText(args[3],"PASS actual release package: "+files.Count+" files");return 0;}catch(Exception e){File.WriteAllText(args[3],e.ToString());return 1;}}
  if(args.Length==2&&args[0]=="--self-test") {try{SelfTest(args[1]);return 0;}catch(Exception e){File.WriteAllText(args[1],e.ToString());return 1;}}
  Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);if(args.Length==2&&args[0]=="--preview"){PreviewMode=true;using(var form=new Updater())using(var bitmap=new System.Drawing.Bitmap(form.Width,form.Height)){form.ShowInTaskbar=false;form.StartPosition=FormStartPosition.Manual;form.Location=new System.Drawing.Point(-10000,-10000);form.Show();Application.DoEvents();form.DrawToBitmap(bitmap,new System.Drawing.Rectangle(0,0,form.Width,form.Height));bitmap.Save(args[1]);}return 0;}
  bool created;using(var mutex=new System.Threading.Mutex(true,"Local\\CRM-BuyerHelper-Updater",out created)){if(!created){MessageBox.Show("更新工具已經開啟。");return 0;}Application.Run(new Updater());}return 0;
 }
 static byte[] Download(string url) {ServicePointManager.SecurityProtocol=SecurityProtocolType.Tls12;Uri uri;if(!Uri.TryCreate(url,UriKind.Absolute,out uri)||uri.Scheme!="https"||uri.Host!="dsiqke8d1w5q2zz5.github.io")throw new Exception("更新網址格式不正確，請下載新版更新工具。");var req=(HttpWebRequest)WebRequest.Create(uri);req.Timeout=45000;req.ReadWriteTimeout=45000;using(var res=req.GetResponse())using(var input=res.GetResponseStream())using(var output=new MemoryStream()){byte[] buffer=new byte[8192];int n;while((n=input.Read(buffer,0,buffer.Length))>0){output.Write(buffer,0,n);if(output.Length>12*1024*1024)throw new Exception("更新檔過大，已停止。");}return output.ToArray();}}
 static string InstallRelease(string target){var j=new JavaScriptSerializer();var meta=j.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(Download(Program.ReleaseBaseUrl+"downloads/buyer-helper-release.json?t="+DateTime.UtcNow.Ticks)));string v=(string)meta["version"],sha=(string)meta["sha256"];Version parsed;if(!Version.TryParse(v,out parsed))throw new Exception("版本資訊不正確。");var files=ReadPackage(Download(Program.ReleaseBaseUrl+"downloads/buyer-search-helper.zip?v="+v),sha);var manifest=j.Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(files["manifest.json"]));if((string)manifest["version"]!=v)throw new Exception("版本與檔案不一致。");Install(files,target);return v;}
 static string Hash(byte[] bytes){using(var h=SHA256.Create())return BitConverter.ToString(h.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
 static Dictionary<string,byte[]> ReadPackage(byte[] bytes,string sha){if(!String.Equals(Hash(bytes),sha,StringComparison.OrdinalIgnoreCase))throw new Exception("下載檔案校驗失敗，原助手保持不變。");var files=new Dictionary<string,byte[]>();long total=0;using(var stream=new MemoryStream(bytes))using(var zip=new ZipArchive(stream,ZipArchiveMode.Read)){foreach(var entry in zip.Entries){if(!Allowed.Contains(entry.FullName)||files.ContainsKey(entry.FullName))throw new Exception("更新檔包含非預期路徑，已停止。");total+=entry.Length;if(total>12*1024*1024)throw new Exception("解壓縮資料過大。");using(var input=entry.Open())using(var output=new MemoryStream()){input.CopyTo(output);files.Add(entry.FullName,output.ToArray());}}}if(!Allowed.SetEquals(files.Keys))throw new Exception("更新檔不完整，原助手保持不變。");return files;}
 static void Install(Dictionary<string,byte[]> files,string target){target=Path.GetFullPath(target);Directory.CreateDirectory(target);if((File.GetAttributes(target)&FileAttributes.ReparsePoint)!=0)throw new Exception("請選擇一般資料夾，不使用連結資料夾。");var backup=new Dictionary<string,byte[]>();var changed=new List<string>();foreach(var name in files.Keys){var file=Path.Combine(target,name);if(Directory.Exists(file))throw new Exception("目標位置存在同名資料夾，已停止。");if(File.Exists(file)&&(File.GetAttributes(file)&FileAttributes.ReadOnly)!=0)throw new Exception("助手檔案為唯讀，請先解除唯讀。");if(File.Exists(file)&&(File.GetAttributes(file)&FileAttributes.ReparsePoint)!=0)throw new Exception("助手資料夾包含連結檔案，已停止。");backup[name]=File.Exists(file)?File.ReadAllBytes(file):null;}
  try{foreach(var item in files){var file=Path.Combine(target,item.Key);changed.Add(item.Key);File.WriteAllBytes(file,item.Value);}}
  catch{foreach(var name in changed){var file=Path.Combine(target,name);if(backup[name]==null)File.Delete(file);else File.WriteAllBytes(file,backup[name]);}throw;}
 }
 static string Chrome(){var paths=new[]{Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"Google\\Chrome\\Application\\chrome.exe"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Google\\Chrome\\Application\\chrome.exe"),Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"Google\\Chrome\\Application\\chrome.exe")};return paths.FirstOrDefault(File.Exists);}
 static void OpenChrome(string url){var chrome=Chrome();if(chrome==null)throw new Exception("找不到 Chrome，請先安裝 Chrome。");Process.Start(new ProcessStartInfo(chrome,"\""+url+"\""){UseShellExecute=true});}
 class Updater:Form {
  TextBox status;Button fresh,existing,extensions,folder;string target;bool busy;
  public Updater(){Text="房仲管家・助手更新工具 1.0.2";Width=650;Height=430;StartPosition=FormStartPosition.CenterScreen;Font=new System.Drawing.Font("Microsoft JhengHei",11);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;
   status=new TextBox{Left=24,Top=24,Width=580,Height=190,Multiline=true,ReadOnly=true,TabStop=false,ScrollBars=ScrollBars.Vertical,BorderStyle=BorderStyle.None,Text="選擇資料夾時，可雙擊進入，也可在上方網址列貼上路徑。\r\n沒有原檔案：選空白資料夾即可下載完整助手。\r\n\r\n已有助手：選原本的助手資料夾，保留原設定。\r\n以後再執行這個 EXE，就會自動更新同一個位置。"};Controls.Add(status);
   fresh=new Button{Left=24,Top=228,Width=180,Height=42,Text="選擇資料夾安裝"};existing=new Button{Left=220,Top=228,Width=250,Height=42,Text="更換／更新助手資料夾"};Controls.Add(fresh);Controls.Add(existing);
   extensions=new Button{Left=24,Top=288,Width=250,Height=42,Text="開啟 Chrome 擴充功能"};folder=new Button{Left=290,Top=288,Width=180,Height=42,Text="開啟助手資料夾"};Controls.Add(extensions);Controls.Add(folder);extensions.Click+=(s,e)=>{try{OpenChrome("chrome://extensions/");}catch(Exception ex){MessageBox.Show(ex.Message);}};folder.Click+=(s,e)=>{if(target!=null&&Directory.Exists(target))Process.Start("explorer.exe","\""+target+"\"");};
   fresh.Click+=async(s,e)=>{if(ChooseFolder())await RunUpdate();};existing.Click+=async(s,e)=>{if(ChooseFolder())await RunUpdate();};
   Shown+=async(s,e)=>{if(PreviewMode)return;if(File.Exists(Settings)){target=File.ReadAllText(Settings).Trim();if(Directory.Exists(target)&&File.Exists(Path.Combine(target,"manifest.json")))await RunUpdate();else status.Text="原安裝位置找不到，請重新選擇助手資料夾。";}};FormClosing+=(s,e)=>{if(busy){e.Cancel=true;status.Text="正在更新檔案，完成後即可關閉。";}};
  }
  bool ChooseFolder(){try{var chosen=ModernFolderPicker.Pick(Handle,target);if(chosen==null)return false;var manifest=Path.Combine(chosen,"manifest.json");if(Directory.GetFileSystemEntries(chosen).Length>0&&(!File.Exists(manifest)||!File.ReadAllText(manifest).Contains("房仲管家"))){MessageBox.Show("請選空白資料夾或房仲管家助手資料夾，避免覆蓋其他檔案。");return false;}target=chosen;return true;}catch(Exception e){MessageBox.Show("無法選取資料夾："+e.Message);return false;}}
  async Task RunUpdate(){if(busy)return;busy=true;fresh.Enabled=existing.Enabled=false;status.Text="正在取得更新資訊及驗證檔案…";try{var version=await Task.Run(()=>{return InstallRelease(target);});Directory.CreateDirectory(Root);File.WriteAllText(Settings,target);status.Text="助手檔案已更新至 "+version+"。\r\n\r\n第一次：開啟擴充功能 → 開發人員模式 → 載入未封裝項目，選下方資料夾。\r\n舊版 1.1：請最後一次按重新載入。新版已連接時會自動重新載入；搜尋中會延後。\r\n"+target;try{OpenChrome(Program.ReleaseBaseUrl+"?helper-update="+version);}catch(Exception ex){status.Text+="\r\n"+ex.Message;}}
   catch(Exception e){status.Text="更新未完成："+e.Message+"\r\n尚未完成安裝，請保留此訊息以便確認原因。";}finally{busy=false;fresh.Enabled=existing.Enabled=true;}}
 }
 static void SelfTest(string report){var root=Path.Combine(Path.GetDirectoryName(Path.GetFullPath(report)),"updater-test-"+Guid.NewGuid().ToString("N"));Directory.CreateDirectory(root);var data=new Dictionary<string,byte[]>();foreach(var name in Allowed)data[name]=Encoding.UTF8.GetBytes(name=="manifest.json"?"{\"version\":\"1.2.0\"}":"test");byte[] bytes;using(var stream=new MemoryStream()){using(var zip=new ZipArchive(stream,ZipArchiveMode.Create,true)){foreach(var item in data){using(var output=zip.CreateEntry(item.Key).Open())output.Write(item.Value,0,item.Value.Length);}}bytes=stream.ToArray();}var files=ReadPackage(bytes,Hash(bytes));Install(files,root);if(!File.Exists(Path.Combine(root,"manifest.json")))throw new Exception("install failed");bool rejected=false;try{ReadPackage(bytes,"bad hash");}catch{rejected=true;}if(!rejected)throw new Exception("hash accepted");using(var stream=new MemoryStream()){using(var zip=new ZipArchive(stream,ZipArchiveMode.Create,true)){using(var writer=new StreamWriter(zip.CreateEntry("../escape.js").Open()))writer.Write("bad");}bytes=stream.ToArray();}rejected=false;try{ReadPackage(bytes,Hash(bytes));}catch{rejected=true;}if(!rejected)throw new Exception("path traversal accepted");File.WriteAllText(report,"PASS package completeness, digest mismatch rejection, path traversal rejection and installation into isolated test folder: "+root);}
}

static class ModernFolderPicker {
 const uint Options=0x20|0x40|0x800|0x02000000; // Pick folders, filesystem, existing path, no MRU updates.
 [ComImport,Guid("DC1C5A9C-E88A-4DDE-A5A1-60F82A20AEF7")]class FileOpenDialog {}
 [ComImport,Guid("42F85136-DB7E-439C-85F1-E4075D135FC8"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface IFileDialog {
  [PreserveSig]int Show(IntPtr owner);
  void SetFileTypes(uint count,IntPtr types);void SetFileTypeIndex(uint index);void GetFileTypeIndex(out uint index);
  void Advise(IntPtr events,out uint cookie);void Unadvise(uint cookie);
  void SetOptions(uint options);void GetOptions(out uint options);
  void SetDefaultFolder(IShellItem item);void SetFolder(IShellItem item);void GetFolder(out IShellItem item);void GetCurrentSelection(out IShellItem item);
  void SetFileName([MarshalAs(UnmanagedType.LPWStr)]string name);void GetFileName(out IntPtr name);
  void SetTitle([MarshalAs(UnmanagedType.LPWStr)]string title);void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)]string label);void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)]string label);
  void GetResult(out IShellItem item);
 }
 [ComImport,Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
 interface IShellItem {
  void BindToHandler(IntPtr context,ref Guid handler,ref Guid iid,out IntPtr result);void GetParent(out IShellItem parent);
  void GetDisplayName(uint kind,out IntPtr name);void GetAttributes(uint mask,out uint attributes);void Compare(IShellItem other,uint hint,out int order);
 }
 [DllImport("shell32.dll",CharSet=CharSet.Unicode,PreserveSig=false)]static extern void SHCreateItemFromParsingName(string path,IntPtr context,ref Guid iid,out IShellItem item);
 static IFileDialog Create(string initial){var dialog=(IFileDialog)new FileOpenDialog();try{dialog.SetOptions(Options);dialog.SetTitle("選擇助手資料夾：可雙擊進入，或在網址列貼上路徑");dialog.SetOkButtonLabel("選擇此資料夾");if(!String.IsNullOrEmpty(initial)&&Directory.Exists(initial)){IShellItem item;var iid=typeof(IShellItem).GUID;SHCreateItemFromParsingName(initial,IntPtr.Zero,ref iid,out item);try{dialog.SetFolder(item);}finally{Marshal.ReleaseComObject(item);}}return dialog;}catch{Marshal.ReleaseComObject(dialog);throw;}}
 static string PathOf(IShellItem item){IntPtr value;item.GetDisplayName(0x80058000,out value);try{return Marshal.PtrToStringUni(value);}finally{Marshal.FreeCoTaskMem(value);}}
 public static string Pick(IntPtr owner,string initial){var dialog=Create(initial);try{var result=dialog.Show(owner);if(result==unchecked((int)0x800704C7))return null;Marshal.ThrowExceptionForHR(result);IShellItem item;dialog.GetResult(out item);try{return PathOf(item);}finally{Marshal.ReleaseComObject(item);}}finally{Marshal.ReleaseComObject(dialog);}}
 public static void Test(string path){var dialog=Create(Path.GetFullPath(path));try{uint flags;dialog.GetOptions(out flags);if((flags&Options)!=Options)throw new Exception("Folder options missing");IShellItem item;dialog.GetFolder(out item);try{if(!String.Equals(Path.GetFullPath(PathOf(item)).TrimEnd('\\'),Path.GetFullPath(path).TrimEnd('\\'),StringComparison.OrdinalIgnoreCase))throw new Exception("Folder roundtrip failed");}finally{Marshal.ReleaseComObject(item);}}finally{Marshal.ReleaseComObject(dialog);}}
}
