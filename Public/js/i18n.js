/* Persian / English switch. Persian is the source language; English is applied on top of the DOM and reverted on switching back. */
(function(){
  var RAW={
    'ورود':'Sign in','فراموشی رمز':'Forgot password','ورود به پنل شکایت':'Enter the complaints panel','برای ادامه وارد شوید یا ثبت نام کنید.':'Sign in or register to continue.','اطلاعات خود را با دقت وارد کنید.':'Enter your details carefully.','فراموشی رمز عبور':'Forgot password','برای تعیین رمز جدید هویت خود را تایید کنید.':'Verify your identity to set a new password.',
    'شماره همراه':'Mobile number','رمز عبور':'Password','رمز عبور جدید':'New password','نام':'First name','نام خانوادگی':'Last name','کد ملی':'National ID','تاریخ تولد':'Date of birth','روز':'Day','ماه':'Month','سال':'Year',
    'فروردین':'Farvardin','اردیبهشت':'Ordibehesht','خرداد':'Khordad','تیر':'Tir','مرداد':'Mordad','شهریور':'Shahrivar','مهر':'Mehr','آبان':'Aban','آذر':'Azar','دی':'Dey','بهمن':'Bahman','اسفند':'Esfand',
    'رمز عبور را فراموش کرده‌ام':'I forgot my password','تغییر رمز عبور':'Change password','حداقل ۸ نویسه، شامل حرف و عدد':'At least 8 characters, letters and numbers','بستن':'Close',
    '🔒 اطلاعات شما رمزنگاری و محرمانه نگهداری می‌شود.':'🔒 Your information is encrypted and kept confidential.','محتوا برای حفظ حریم خصوصی پنهان شد':'Content hidden to protect your privacy',
    /* landing */
    'عدالت در دستان شماست.':'Justice is in your hands.',
    'امام صادق علیه‌السلام:':'Imam al-Sadiq (peace be upon him):',
    'عدالت از عسل شیرین‌تر، از کره نرم‌تر و از مشک خوشبوتر است.':'Justice is sweeter than honey, softer than butter, and more fragrant than musk.',
    '[کافی، ج ۲، ص ۱۴۷، ح ۱۵]':'[Al-Kafi, vol. 2, p. 147, h. 15]',
    'به سامانه‌ی مدیریت منزل خوش آمدید. ما بسیار سپاسگزاریم که ما را انتخاب نمودید. ما در راستای اجرای عدالت این سامانه را راه انداخته‌ایم تا بتوانید به صورت کاملاً آنلاین از دیگران شکایت کنید.':'Welcome to the House Management system. We are very grateful that you chose us. We launched this system to serve justice, so that you can file complaints against others fully online.',
    'به دلیل خصوصی بودن این سازمان و تعداد بسیار کم مشتریان، کوچک‌ترین شکایت با پیشرفته‌ترین و بهترین روش پیگیری می‌شود.':'Because this organization is private and has very few clients, even the smallest complaint is followed up with the most advanced and best methods.',
    'این سامانه برای ما منافع مادی ندارد؛ منافع معنوی دارد، یعنی خوشحالی ما از کمک کردن به شما. سوال و انتقادات را می‌پذیریم و بررسی می‌کنیم؛ اگر قابل حل باشد، انتقاد شما را پذیرفته و سامانه را ویرایش خواهیم کرد.':'This system brings us no material gain; its reward is spiritual: our joy in helping you. We welcome questions and criticism and review them; if a problem can be solved, we will accept your feedback and update the system.',
    'ورود به پنل شکایت':'Enter the complaints panel','ثبت نام':'Sign up','تصویر منظره':'Landscape illustration','تصویر پنل کاربری':'User panel screenshot','خوش آمدید':'Welcome',
    '© ۱۴۰۵ سازمان مدیریت منزل':'© 2026 House Management Organization',
    'این صفحه در نسخه‌ی نهایی سایت تکمیل می‌شود.':'This page will be completed in the final version of the site.',
    /* header + shell */
    'سازمان مدیریت منزل':'House Management Organization','لوگوی سازمان مدیریت منزل':'House Management Organization logo',
    'پنل شکایت':'Complaints panel','پنل مدیریت':'Admin panel','قوانین':'Rules','درباره':'About','ارتباط':'Contact',
    'منوی اصلی':'Main menu','حالت تاریک و روشن':'Toggle dark mode','منوی پنل کاربری':'User panel menu','منوی پنل مدیریت':'Admin panel menu',
    'مریم احمدی':'Maryam Ahmadi','مدیر سامانه':'Site administrator','ادمین':'Admin','م':'M','ب':'N',
    'داشبورد':'Dashboard','داشبورد مدیریت':'Admin dashboard','شکایات من':'My complaints','همه‌ی شکایات':'All complaints',
    'ثبت شکایت جدید':'File a new complaint','ابلاغیه‌ها':'Notices','پروفایل':'Profile','گزارش تغییرات':'Change log','خروج':'Log out',
    /* shared words */
    'جدید':'New','در حال بررسی':'Under review','ابلاغ شده':'Notified','مختومه':'Closed','همه':'All','حقوقی':'Civil','کیفری':'Criminal',
    'پرونده حقوقی':'Civil case','پرونده کیفری':'Criminal case','پرونده':'Case','شماره':'No.','شماره ابلاغیه:':'Notice no.:','تاریخ:':'Date:','برای:':'For:',
    'کد رهگیری':'Tracking code','عنوان':'Title','تاریخ':'Date','وضعیت':'Status','نوع پرونده':'Case type','نوع':'Type','عملیات':'Actions',
    'شاکی':'Complainant','مشاهده':'View','بررسی':'Review','بازگشت':'Back','انصراف':'Cancel','حذف':'Remove','پاک کردن':'Clear','تایید':'Confirmation',
    'خوانده‌نشده':'Unread','در انتظار':'Pending','امضای شاکی':'Complainant\'s signature','ابلاغیه':'Notice','ارسال شد':'sent','مدرک':'Document',
    /* dashboard (user) */
    'خوش آمدید، مریم احمدی':'Welcome, Maryam Ahmadi','خلاصه‌ی وضعیت پرونده‌های شما در سازمان مدیریت منزل':'Summary of your cases at the House Management Organization',
    'کل شکایات':'Total complaints','مختومه ':'Closed','ابلاغیه‌های جدید':'New notices','آخرین شکایت‌ها':'Latest complaints',
    /* complaints */
    'همه‌ی پرونده‌هایی که ثبت کرده‌اید.':'All the cases you have filed.','جستجو در شکایت‌ها':'Search complaints','شکایتی با این فیلتر پیدا نشد.':'No complaints match this filter.',
    'اختلاف در قرارداد اجاره':'Rental contract dispute','مزاحمت و تهدید تلفنی':'Harassment and threats by phone','مطالبه وجه قرارداد':'Contract payment claim','توهین و افترا در فضای مجازی':'Online insult and defamation',
    'مطالبه خسارت از پیمانکار تعمیرات':'Damages claim against repair contractor',
    /* case detail (user) */
    'بازگشت به شکایات من':'Back to my complaints','جزئیات شکایت':'Complaint details','تاریخ ثبت':'Filed on','روند پرونده':'Case progress','ثبت شکایت':'Complaint filed','ابلاغیه صادر شد':'Notice issued',
    'توضیحات کارشناس':'Expert\'s comments','مدارک پیوست':'Attached documents','قرارداد اجاره.pdf':'Rental contract.pdf','رسید پرداخت.pdf':'Payment receipt.pdf','امضای ثبت‌شده':'Registered signature',
    'دانلود گواهی مختومه پرونده':'Download case closure certificate','دانلود گواهی پس از اتصال به سرور فعال می‌شود.':'The certificate download will work once the server is connected.',
    'پرونده پس از بررسی مدارک و اظهارات طرفین مختومه شد. طرفین باید به رای اعلام‌شده عمل کنند.':'The case was closed after reviewing the documents and statements. The parties must comply with the announced verdict.',
    'پرونده در حال بررسی مستندات است. نتیجه پس از تکمیل ارزیابی اعلام خواهد شد.':'The case documents are under review. The result will be announced once the evaluation is complete.',
    /* new complaint */
    'مرحله ۱ از ۳ — اطلاعات شکایت':'Step 1 of 3 — Complaint details','مرحله ۲ از ۳ — مدارک و امضا':'Step 2 of 3 — Documents and signature','اطلاعات':'Details','مدارک و امضا':'Documents and signature',
    'دادخواست':'Civil petition','شکواییه':'Criminal complaint','نام متهم / خوانده':'Defendant\'s name','شماره همراه':'Mobile number','موضوع شکایت':'Complaint subject','تاریخ وقوع':'Date of incident','توضیحات':'Description',
    'مرحله بعد':'Next step','نام متهم و موضوع شکایت را وارد کنید.':'Enter the defendant\'s name and the complaint subject.',
    'مدارک خود را اینجا رها کنید یا انتخاب کنید':'Drop your documents here or choose files','امضای شاکی ':'Complainant\'s signature','با انگشت یا ماوس امضا کنید':'Sign with your finger or mouse',
    'قوانین را مطالعه کرده‌ام و می‌پذیرم':'I have read and accept the rules','ثبت نهایی شکایت':'Submit complaint','لطفاً کادر امضا را پر کنید.':'Please sign in the box.','پذیرش قوانین الزامی است.':'You must accept the rules.',
    'شکایت شما ثبت شد. (نسخه‌ی نمایشی)':'Your complaint was submitted. (demo version)','کادر امضا':'Signature box',
    /* notices (user) */
    'ابلاغیه‌هایی که ادمین درون برنامه برای شما صادر کرده است.':'In-app notices issued to you by the admin.',
    'ابلاغیه دعوت به جلسه رسیدگی':'Hearing invitation notice','درخواست ارسال مدرک تکمیلی':'Request for additional documents','گواهی مختومه شدن پرونده':'Case closure certificate','تایید ثبت شکایت':'Complaint filing confirmation',
    'پرونده‌ی «اختلاف در قرارداد اجاره» برای رسیدگی در تاریخ ۱۴۰۵/۰۸/۲۰ ساعت ۱۶:۰۰ تعیین وقت شده است. حضور شاکی الزامی است.':'A hearing for the case “Rental contract dispute” is scheduled for 1405/08/20 at 16:00. The complainant must attend.',
    'لطفاً تصویر رسید پرداخت اجاره‌ی ماه‌های اخیر را تا پایان هفته به پرونده‌ی خود اضافه کنید.':'Please add a photo of your recent rent payment receipts to your case by the end of the week.',
    'پرونده‌ی «مزاحمت و تهدید تلفنی» با حکم صادر شده مختومه اعلام شد. گواهی در بخش جزئیات پرونده در دسترس است.':'The case “Harassment and threats by phone” was closed with the issued verdict. The certificate is available in the case details.',
    'شکایت شما با موفقیت ثبت شد و در صف بررسی کارشناس قرار گرفت.':'Your complaint was filed successfully and is in the expert review queue.',
    /* profile */
    'اطلاعات حساب و رمز عبور':'Account details and password','اطلاعات شخصی':'Personal information','نام و نام خانوادگی':'Full name','کد ملی':'National ID','تاریخ تولد':'Date of birth','ذخیره تغییرات':'Save changes',
    'تغییر رمز عبور':'Change password','رمز عبور فعلی':'Current password','رمز عبور جدید':'New password','تکرار رمز عبور':'Repeat password','ثبت تغییرات رمز':'Update password',
    'تغییرات ذخیره شد. (نسخه‌ی نمایشی)':'Changes saved. (demo version)','رمز جدید و تکرار آن یکسان نیست.':'The new password and its repeat do not match.','رمز عبور تغییر کرد. (نسخه‌ی نمایشی)':'Password changed. (demo version)',
    'این صفحه در نسخه‌ی نهایی سایت تکمیل می‌شود.':'This page will be completed in the final version of the site.','خروج در نسخه‌ی نمایشی غیرفعال است.':'Log out is disabled in the demo.',
    /* admin */
    'امروز ۱۴۰۵/۰۸/۱۰ — وضعیت کلی پرونده‌های سامانه':'Today 1405/08/10 — overview of all cases in the system','شکایت جدید':'New complaints','نیازمند اقدام':'Needs action','پرونده‌ی بازی وجود ندارد.':'There are no open cases.',
    'شکایت‌های ثبت‌شده توسط مشتریان.':'Complaints filed by customers and by admins.','جستجو بر اساس کد، شاکی یا عنوان':'Search by code, complainant or title','منبع':'Source','ثبت‌شده توسط من':'Filed by me',
    'بازگشت به شکایات':'Back to complaints','اطلاعات طرفین':'Parties','کد ملی شاکی':'Complainant national ID','متهم / خوانده':'Defendant','متن شکایت':'Complaint text','مدارک شاکی':'Complainant\'s documents','سوابق پرونده':'Case history',
    'وضعیت پرونده':'Case status','وضعیت جدید':'New status','توضیحات برای شاکی':'Note for the complainant','(برای مختومه کردن الزامی است)':'(required to close a case)','ثبت وضعیت و توضیح':'Save status and note',
    'ابلاغیه‌ی درون‌برنامه‌ای':'In-app notice','عنوان ابلاغیه':'Notice title','مثلاً دعوت به جلسه رسیدگی':'e.g. Hearing invitation','متن ابلاغیه':'Notice text','ارسال ابلاغیه به شاکی':'Send notice to complainant',
    'ضمینه و مدارک ادمین':'Attachments and admin documents','افزودن مدرک یا ضمینه به پرونده':'Add a document or attachment to the case',
    'ابلاغیه‌هایی که برای مشتریان صادر شده است.':'Notices issued to customers.','همه‌ی اقدام‌های ادمین ثبت می‌شود تا بعداً قابل پیگیری باشد.':'Every admin action is recorded so it can be traced later.',
    'هنوز ابلاغیه‌ای صادر نشده است.':'No notices have been issued yet.','ابلاغیه‌ای برای نمایش نیست.':'There is no notice to show.','دعوت به جلسه رسیدگی':'Hearing invitation',
    'جلسه رسیدگی در تاریخ ۱۴۰۵/۰۸/۲۰ ساعت ۱۶:۰۰ برگزار می‌شود.':'The hearing will be held on 1405/08/20 at 16:00.',
    'برای مختومه کردن، توضیحات را بنویسید.':'To close a case, write a note first.','تغییری برای ثبت وجود ندارد.':'There is nothing to save.','وضعیت و توضیحات ثبت شد.':'Status and note saved.',
    'عنوان و متن ابلاغیه را بنویسید.':'Write the notice title and text.','ابلاغیه برای شاکی ارسال شد.':'The notice was sent to the complainant.','شکایت شما ثبت شد و در فهرست شکایات قرار گرفت.':'Your complaint was filed and added to the list.',
    'ثبت‌کننده':'Filed by','مشتریان':'Customers','مدیر':'Admin','شکایت ثبت شد و به فهرست پرونده‌ها اضافه شد.':'The complaint was filed and added to the case list.','شکایت‌های ثبت‌شده توسط مشتریان.':'Complaints filed by customers and by the admin.',
    'جستجو':'Search','شما در این بخش به عنوان شاکی از طرف دیگری شکایت ثبت می‌کنید.':'Here you file a complaint against another party as the complainant.',
    /* admin sample data */
    'علی رضایی':'Ali Rezaei','رضا کریمی':'Reza Karimi','نرگس صالحی':'Narges Salehi','سعید نوری':'Saeed Nouri','حمید توکلی':'Hamid Tavakoli','مجید فرهادی':'Majid Farhadi','شرکت نوین ساز':'Novin Saz Company',
    'مالک بدون اطلاع قبلی اجاره‌بها را افزایش داده و از بازگرداندن مبلغ ودیعه خودداری می‌کند.':'The landlord raised the rent without prior notice and refuses to return the deposit.',
    'متهم در یک گروه عمومی پیام‌های توهین‌آمیز و نسبت‌های ناروا درباره شاکی منتشر کرده است.':'The defendant posted insulting messages and false accusations about the complainant in a public group.',
    'مبلغ قرارداد پس از تحویل کار پرداخت نشده و خوانده به تماس‌ها پاسخ نمی‌دهد.':'The contract amount was not paid after the work was delivered, and the defendant does not answer calls.',
    'تماس‌های مکرر شبانه همراه با تهدید.':'Repeated late-night calls with threats.',
    'پیمانکار تعمیرات ساختمان کار را نیمه‌کاره رها کرده و خسارت وارد شده را جبران نمی‌کند.':'The building repair contractor left the work half-finished and refuses to compensate for the damage.',
    'تصویر پیام‌ها.png':'Message screenshots.png','قرارداد.pdf':'Contract.pdf','فاکتور.pdf':'Invoice.pdf','گزارش تماس‌ها.pdf':'Call report.pdf','قرارداد پیمانکاری.pdf':'Contractor agreement.pdf',
    'مدارک در حال بررسی است.':'Documents are under review.','ابلاغیه صادر شد.':'Notice issued.','پرونده با رای صادرشده مختومه اعلام شد.':'The case was closed with the issued verdict.'
  };
  function nz(s){return s.replace(/‌/g,'')}
  var EN={};Object.keys(RAW).forEach(function(k){EN[nz(k).trim()]=RAW[k]});
  var keys=Object.keys(EN).sort(function(a,b){return b.length-a.length});
  var PAIRS=keys.map(function(k){return [new RegExp('(?<![\\u0600-\\u06FF])'+k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\u0600-\\u06FF])','g'),EN[k]]});
  var FAD='۰۱۲۳۴۵۶۷۸۹';
  function tr(s){
    var lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],k=nz(s).trim();
    if(!k)return s;
    var out;
    if(EN[k]!==undefined)out=EN[k];
    else{out=k;PAIRS.forEach(function(p){out=out.replace(p[0],p[1])})}
    out=out.replace(/[۰-۹]/g,function(d){return FAD.indexOf(d)}).replace(/،/g,',').replace(/؟/g,'?').replace(/«/g,'“').replace(/»/g,'”');
    return lead+out+trail;
  }
  window.__tr=tr;
  var lang='fa',TS=new WeakMap(),AS=new WeakMap(),ATTR=['placeholder','aria-label','alt','title'];
  var cfg={childList:true,subtree:true};
  function proc(n){
    if(n.nodeType===3){
      var p=n.parentNode;if(!p||p.nodeName==='SCRIPT'||p.nodeName==='STYLE')return;
      var o=TS.get(n);
      if(o===undefined){if(!/[؀-ۿ]/.test(n.nodeValue))return;o=n.nodeValue;TS.set(n,o)}
      var en=p.getAttribute&&p.getAttribute('data-en');
      n.nodeValue=lang==='en'?(en?en:tr(o)):o;return;
    }
    if(n.nodeType!==1||n.nodeName==='SCRIPT'||n.nodeName==='STYLE'||n.hasAttribute('data-noi18n'))return;
    ATTR.forEach(function(a){
      if(!n.hasAttribute(a))return;
      var m=AS.get(n)||{};
      if(!(a in m)){var v=n.getAttribute(a);if(!/[؀-ۿ]/.test(v))return;m[a]=v;AS.set(n,m)}
      n.setAttribute(a,lang==='en'?tr(m[a]):m[a]);
    });
    for(var c=n.firstChild;c;c=c.nextSibling)proc(c);
  }
  var mo=new MutationObserver(function(ms){
    if(lang!=='en')return;
    mo.disconnect();
    ms.forEach(function(m){Array.prototype.forEach.call(m.addedNodes,proc)});
    mo.observe(document.body,cfg);
  });
  function setLang(l){
    lang=l;mo.disconnect();
    document.documentElement.setAttribute('lang',l==='en'?'en':'fa');
    proc(document.body);
    Array.prototype.forEach.call(document.querySelectorAll('input[data-tv]'),function(el){
      if(!el.dataset.fa)el.dataset.fa=el.value;
      el.value=l==='en'?tr(el.dataset.fa):el.dataset.fa;
    });
    var b=document.getElementById('lang');
    if(b){b.textContent=l==='en'?'فا':'EN';b.setAttribute('aria-label',l==='en'?'Switch to Persian':'تغییر زبان')}
    try{localStorage.setItem('mh-lang',l)}catch(e){}
    mo.observe(document.body,cfg);
  }
  window.__setLang=setLang;
  var b=document.getElementById('lang');
  if(b)b.addEventListener('click',function(){setLang(lang==='en'?'fa':'en')});
  var saved=null;try{saved=localStorage.getItem('mh-lang')}catch(e){}
  if(saved==='en')setLang('en');else mo.observe(document.body,cfg);
})();
