"""Build the deployable Wiltshire Tutoring static site from shared HTML components.

Run: python -m pip install -r requirements.txt && python build.py
The generated .html files can be uploaded directly to Hostinger/public_html.
"""
from pathlib import Path
import json, html
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
SITE='https://wiltshiretutors.com'

def load(name):return json.loads((DATA/f'{name}.json').read_text(encoding='utf-8'))
subjects=load('subjects');exams=load('exams');areas=load('areas');all_towns=load('all-towns');extra_subjects=load('extra-subjects');testimonials=load('testimonials');tutors=load('tutors');posts=load('blog-posts')
env=Environment(loader=FileSystemLoader([str(ROOT/'templates'),str(ROOT)]),autoescape=select_autoescape(['html','xml']),trim_blocks=True,lstrip_blocks=True)
subject_icons={'maths':'bi-calculator','physics':'bi-lightning-charge','chemistry':'bi-droplet-half','biology':'bi-flower2','english':'bi-pencil-square','english-literature':'bi-book','further-maths':'bi-infinity','economics':'bi-graph-up-arrow','business':'bi-briefcase','computer-science':'bi-code-slash','history':'bi-hourglass-split','geography':'bi-globe-europe-africa','french':'bi-translate','spanish':'bi-chat-quote','psychology':'bi-person-heart','politics':'bi-bank','welsh':'bi-chat-dots'}

org={'@type':'EducationalOrganization','@id':SITE+'/#organization','name':'Wiltshire Tutoring','alternateName':'Wiltshire Tutors','url':SITE+'/','logo':{'@type':'ImageObject','url':SITE+'/assets/images/favicon-512.png'},'image':SITE+'/assets/images/og-wiltshire-tutoring.jpg','slogan':'Delivering a better future','description':'Personalised online Maths, Physics, English, Chemistry, Biology, Further Maths and other subject tutoring for Wiltshire families, including SATs, 11+, 13+, GCSE, IGCSE, A-Level, UCAT and TMUA preparation.','email':'wiltshire@nwttutoring.com','priceRange':'From £23 per hour for GCSE and below; from £28 per hour for A-Level and above','sameAs':['https://www.facebook.com/wiltshiretutoring','https://www.instagram.com/wiltshiretutoring/'],'areaServed':[{'@type':'AdministrativeArea','name':'Wiltshire, England'},{'@type':'Place','name':'Swindon, Wiltshire'}]+[{'@type':'Place','name':name+', Wiltshire'} for name in all_towns if name!='Swindon'],'parentOrganization':{'@id':'https://nwttutoring.com/#organization','@type':'Organization','name':'North Wales Tutoring Group','url':'https://nwttutoring.com/'},'contactPoint':{'@type':'ContactPoint','contactType':'online enquiries','url':'https://wa.me/447480231362','email':'wiltshire@nwttutoring.com','availableLanguage':['English','Welsh']}}
website={'@type':'WebSite','@id':SITE+'/#website','url':SITE+'/','name':'Wiltshire Tutoring','publisher':{'@id':SITE+'/#organization'},'inLanguage':'en-GB'}

common_faqs=[
{'q':'Do you offer online tutoring across Wiltshire?','a':'Yes. We support families across Swindon, Salisbury, Trowbridge, Chippenham, Melksham, Devizes and surrounding Wiltshire towns and villages through live online one-to-one lessons.'},
{'q':'How much does one-to-one online tutoring cost?','a':'Prices start from £23 per hour for GCSE and below and £28 per hour for A-Level and above. Specialist tutors and qualifications may cost more; we confirm the exact price before you book.'},
{'q':'Which exam boards do your tutors cover?','a':'Our wider tutoring network supports major UK specifications including AQA, Pearson Edexcel, OCR, Eduqas, WJEC and Cambridge International (CAIE). Please share the exact board or qualification when you enquire.'},
{'q':'Is there a free trial lesson or a subscription?','a':'There is no free trial lesson. Tuition is pay as you go, with no compulsory subscription. Enquiries are free, and we confirm the tutor, rate and lesson details before booking.'},
{'q':'How do I arrange a tutor?','a':'Send your name, email address, phone number and a brief message about the student’s year group, subject, exam board and preferred lesson times. Our team will respond to discuss suitable options.'}
]

def breadcrumb(crumbs):
    data=[{'@type':'ListItem','position':i+1,'name':name,'item':SITE+url} for i,(name,url) in enumerate(crumbs)]
    return {'@type':'BreadcrumbList','@id':SITE+crumbs[-1][1]+'#breadcrumb','itemListElement':data}

def build_schema(path,title,description,crumbs,kind='WebPage',service=None,article=None):
    page={'@type':kind,'@id':SITE+path+'#webpage','url':SITE+path,'name':title,'description':description,'inLanguage':'en-GB','isPartOf':{'@id':SITE+'/#website'},'publisher':{'@id':SITE+'/#organization'},'breadcrumb':{'@id':SITE+path+'#breadcrumb'}}
    graph=[org,website,page,breadcrumb(crumbs)]
    if service:
        name,level,area=service
        service_id=SITE+path+'#service'
        graph.append({'@type':'Service','@id':service_id,'name':name,'serviceType':level,'provider':{'@id':SITE+'/#organization'},'areaServed':[{'@type':'AdministrativeArea','name':'Wiltshire, England'},{'@type':'Place','name':area}],'availableChannel':{'@type':'ServiceChannel','serviceUrl':SITE+'/contact.html','name':'Live online tutoring'},'offers':{'@type':'AggregateOffer','priceCurrency':'GBP','lowPrice':'23','offerCount':'2','description':'Starting prices: GCSE and below from £23/hr; A-Level and above from £28/hr. Individual prices vary.'}})
        page['mainEntity']={'@id':service_id}
    if article:
        graph.append({'@type':'BlogPosting','@id':SITE+path+'#article','headline':article['title'],'datePublished':article['date'],'dateModified':article['date'],'image':SITE+'/assets/images/og-wiltshire-tutoring.jpg','author':{'@type':'Organization','name':'Wiltshire Tutoring Team'},'publisher':{'@id':SITE+'/#organization'},'mainEntityOfPage':{'@id':SITE+path+'#webpage'},'description':article['excerpt'],'inLanguage':'en-GB'})
        page['mainEntity']={'@id':SITE+path+'#article'}
    return {'@context':'https://schema.org','@graph':graph}

def faq_schema(faqs):return {'@context':'https://schema.org','@type':'FAQPage','mainEntity':[{'@type':'Question','name':q['q'],'acceptedAnswer':{'@type':'Answer','text':q['a']}} for q in faqs]} if faqs else None

built=[]
def render(template,path,title,description,page_type,crumbs=None,faqs=None,service=None,article=None,**kwargs):
    if not path.startswith('/'):raise ValueError(path)
    if not crumbs:crumbs=[('Home','/'),(title.split('|')[0].strip(),path)]
    context={'path':path,'meta':{'title':title,'description':description},'page_type':page_type,'article':bool(article),'schema':build_schema(path,title,description,crumbs,service=service,article=article),'faq_schema':faq_schema(faqs),'faqs':faqs or [],'subjects':subjects,'nav_subjects':[x for x in subjects if x['slug'] in ('maths','physics','chemistry','biology','english','english-literature','further-maths','economics','business','computer-science','history','geography','french','spanish')], 'exams':exams,'areas':areas,'testimonials':testimonials,'tutors':tutors,'extra_subjects':extra_subjects,'all_towns':all_towns,'posts':posts,'subject_icons':subject_icons,**kwargs}
    content=env.get_template(template).render(**context)
    target=ROOT/('index.html' if path=='/' else path.lstrip('/'))
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(content,encoding='utf-8')
    built.append(path)
    return target

home_faqs=[common_faqs[0],common_faqs[1],common_faqs[2],common_faqs[3],{'q':'Do you provide GCSE Physics and A-Level Maths tutoring for Wiltshire students?','a':'Yes, our wider tutoring network includes specialist Physics and Maths tutors. We confirm each tutor’s availability and suitability for the exact GCSE or A-Level specification before booking.'}]

home_towns=[{'name':a['name'],'slug':a['slug']} for a in areas[:8]]
render('home.html','/','Online Tutors Wiltshire | GCSE Maths, Physics & A-Level | Wiltshire Tutoring','Online tutoring for Wiltshire students: GCSE Maths, Physics, Chemistry, Biology, English, SATs, 11+, A-Level and TMUA. Swindon, Salisbury & more. From £23/hr.','home',faqs=home_faqs,service=('Online one-to-one tutoring for Wiltshire students','Primary, KS3, GCSE, A-Level and entrance exams','Wiltshire'),featured_subjects=[next(s for s in subjects if s['slug']==slug) for slug in ['maths','physics','chemistry','biology','english','further-maths','computer-science','economics']],featured_exams=[next(e for e in exams if e['slug']==slug) for slug in ['gcse','a-level','sats','11-plus','13-plus','ucat','tmua','igcse']],home_towns=home_towns)

hubs={
'subjects':{'hub_name':'All Subjects','label':'MATHS, SCIENCE, ENGLISH & MORE','heading':'Online subject tutoring for Wiltshire students','lead':'Explore one-to-one online tutoring for Maths, Physics, Chemistry, Biology, English, Further Maths and more across Wiltshire. Lessons are tailored to subject, level and exam board.','grid_heading':'Subjects we help students master.','grid_intro':'Choose a subject to explore how our tutoring works, the topics we cover and how to enquire.','section_title':'Different subjects. The same personal approach.','section_body':'Our tutors use guided explanation, structured practice and feedback appropriate to each subject, from calculation-heavy Maths and Physics to analytical writing in English and History.','split_image':'/assets/images/maths-physics-tutor-online-one-to-one-uk.jpg'},
'exams':{'hub_name':'Exam Preparation','label':'EXAM TUTORS FOR WILTSHIRE STUDENTS','heading':'SATs, 11+, GCSE, A-Level & Entrance Exam Tutors','lead':'Prepare for SATs, 11+, 13+, GCSE, IGCSE, A-Level, UCAT, TMUA and more with experienced online tutors serving students across Wiltshire.','grid_heading':'Targeted support for every important exam.','grid_intro':"We match the learning plan to the student's stage, the exact qualification and the exam board.",'section_title':'Preparation built around the exam you will actually sit.','section_body':'Our team asks about the awarding body, target topics, exam dates and any recent assessments. This makes tutoring more relevant than generic revision and helps students focus on the questions that matter.','split_image':'/assets/images/gcse-online-one-to-one-tutoring-uk.jpg'},
'areas':{'hub_name':'Wiltshire Areas','label':'ONLINE TUTORS ACROSS WILTSHIRE','heading':'Online Tutoring for Swindon, Salisbury & Wiltshire Students','lead':'Wiltshire Tutoring serves families across the county, including Swindon, Salisbury, Trowbridge, Chippenham, Melksham, Devizes, Marlborough and Warminster. All tuition is online.','grid_heading':'Find online tutoring for your Wiltshire town.','grid_intro':'Whether you live in a major town or a smaller village, connect with an experienced UK tutor from home.','section_title':'Specialist tutors available without travel.','section_body':'Live online lessons make it easier to find support for a particular exam board or subject, including A-Level Physics and Further Maths. We serve Wiltshire communities remotely, with no physical tutoring centre implied.','split_image':'/assets/images/online-one-to-one-tutoring-uk-wales-england.jpg'}
}
for mode,h in hubs.items():
    hf=common_faqs[:3]
    if mode=='areas':hf=common_faqs[:2]+[{'q':'Do you have physical tutoring centres in these towns?','a':'No. Wiltshire Tutoring provides live online lessons. Town coverage describes areas we serve, not physical branches, offices or local walk-in centres.'},common_faqs[4]]
    items={'subjects':subjects,'exams':exams,'areas':areas}[mode]
    render('hub.html','/'+mode+'.html',{'subjects':'Subjects | Online Maths, Physics & English Tutors Wiltshire','exams':'Exam Tutors Wiltshire | SATs, 11+, GCSE, A-Level, UCAT & TMUA','areas':'Online Tutors Across Wiltshire | Swindon, Salisbury, Trowbridge'}[mode],h['lead'][:154],mode,crumbs=[('Home','/'),(h['hub_name'],'/'+mode+'.html')],faqs=hf,mode=mode,items=items,other_towns=[x for x in all_towns if x not in [a['name'] for a in areas]],**h)

render('about.html','/about.html','About Wiltshire Tutoring | Part of North Wales Tutoring Group','Learn about Wiltshire Tutoring, our approach to personalised online Maths, Science and English tuition, and our vision: delivering a better future.','about',crumbs=[('Home','/'),('About Us','/about.html')])
render('contact.html','/contact.html','Contact Wiltshire Tutoring | Find GCSE, A-Level & Maths Tutors','Contact Wiltshire Tutoring for online GCSE Maths, Physics, English, Science, SATs, 11+ and A-Level tuition. Email wiltshire@nwttutoring.com.','contact',faqs=[common_faqs[4],common_faqs[1],common_faqs[3]])
render('tutors.html','/tutors.html','Our Online Tutors | Maths, Physics, English & Science | Wiltshire','Find online Maths, Physics, English and Science tutors for Wiltshire learners. Qualified teachers, full-time tutors, graduates and some experienced examiners.','tutors',faqs=[{'q':'Are your online tutors based locally?','a':'Not necessarily. These are examples from our wider UK tutor network. Tuition is online; we confirm tutor suitability, qualifications and availability before booking.'},common_faqs[1],common_faqs[4]])
render('careers.html','/careers.html','Become an Online Tutor | Careers | Wiltshire Tutoring','Apply to tutor online with North Wales Tutoring Group through Wiltshire Tutoring. UK-based Maths, Physics, English, Science and GCSE or A-Level tutors welcome.','careers',crumbs=[('Home','/'),('Become a Tutor','/careers.html')],faqs=[{'q':'Are tutoring roles self-employed?','a':'Yes. Tutors work with our group on a self-employed basis. We confirm the arrangements and requirements during onboarding.'},{'q':'Do I need an Enhanced DBS?','a':'Our safeguarding requirements include an Enhanced DBS check with Children’s Barred List information for tutors working with children. We will explain the checks required before appointment.'},{'q':'Will there be guaranteed students or hours?','a':'No. Enquiring does not guarantee a position or any minimum tutoring hours.'}])
render('tutor-directory.html','/our-tutors.html','Online Tutor Directory for Wiltshire Students | Subjects and Levels','Browse online tutors in the North Wales Tutoring Group network for Wiltshire students. Search Maths, Physics, English and Science by subject and school stage.','tutor-directory',crumbs=[('Home','/'),('Our Tutors','/tutors.html'),('Tutor Directory','/our-tutors.html')],faqs=[{'q':'Are these tutors located in Wiltshire?','a':'Not necessarily. Tutors are part of our wider UK online tutoring network. We do not advertise physical Wiltshire offices or guarantee individual availability.'},common_faqs[1],common_faqs[4]],directory_tutors=tutors,directory_subjects=sorted({label.strip() for tutor in tutors for label in tutor['speciality'].split(' · ')}))
render('pricing.html','/pricing.html','Online Tutoring Prices Wiltshire | GCSE from £23, A-Level £28','See online tutoring starting prices for Wiltshire students: from £23/hr for GCSE and below and from £28/hr for A-Level and above. Flexible pay-as-you-go lessons.','pricing',faqs=[common_faqs[1],common_faqs[3],{'q':'What is your cancellation policy?','a':'We require at least 24 hours’ notice to cancel or rearrange a lesson. Late cancellations may be charged in full; your booking details will explain the policy.'},{'q':'Do I pay the tutor directly?','a':'Our team confirms the payment arrangements when the lesson is booked. Payment is made before the scheduled lesson.'}])

for s in subjects:
    path=f"/subjects/{s['slug']}.html"
    fs=[{'q':f"Can Wiltshire students get online {s['name']} tutoring?",'a':f"Yes. Wiltshire Tutoring helps families in Swindon, Salisbury, Trowbridge, Chippenham and wider Wiltshire find suitable online {s['name']} tuition, subject to tutor availability."},common_faqs[1],common_faqs[2]]
    rel=[x for x in subjects if x['slug']!=s['slug']][:6]
    render('detail.html',path,f"{s['name']} Tutor Wiltshire | Online GCSE & A-Level Tuition",f"Online {s['name']} tutoring for Wiltshire students for GCSE, A-Level and relevant school stages. Personalised UK tutors serving Swindon, Salisbury and beyond. Enquire today.",'subject',crumbs=[('Home','/'),('Subjects','/subjects.html'),(s['name'],path)],faqs=fs,service=(f"Online {s['name']} tutoring for Wiltshire students",'School and exam tuition','Wiltshire'),item=s,detail_type='subjects',related=rel,badge=f"ONLINE {s['name'].upper()} TUTORING",feature_icon=subject_icons[s['slug']])

for e in exams:
    path=f"/exams/{e['slug']}.html"
    fs=[{'q':f"Can Wiltshire Tutoring help with {e['name']} preparation?",'a':f"Yes. We can discuss online {e['name']} preparation across Wiltshire and match suitable specialist tutoring subject to experience and availability."},common_faqs[1],{'q':'Will my lessons follow the right exam specification?','a':'We ask for the exact exam or assessment, awarding body where relevant, year group and topics before suggesting a study plan. Always check admissions requirements and test dates with the official provider.'}]
    render('detail.html',path,f"{e['name']} Tutor Wiltshire | Online Exam Preparation",f"Online {e['name']} preparation for students across Wiltshire, including Swindon, Salisbury, Trowbridge and Chippenham with flexible one-to-one lessons.",'exam',crumbs=[('Home','/'),('Exam Preparation','/exams.html'),(e['name'],path)],faqs=fs,service=(f"{e['name']} preparation and tutoring for Wiltshire students",e['subtitle'],'Wiltshire'),item=e,detail_type='exams',related=[x for x in exams if x['slug']!=e['slug']][:6],badge=f"{e['name'].upper()} EXAM PREPARATION",feature_icon='bi-mortarboard')

for a in areas:
    path=f"/areas/{a['slug']}.html"
    a=dict(a, title=f"Online tutors for students in {a['name']}, Wiltshire",subtitle=a['lead'])
    fs=[{'q':f"Do you provide online tutoring for {a['name']} students?",'a':f"Yes. Our online one-to-one tutoring service is available to students in {a['name']} and surrounding Wiltshire communities."}, {'q':f"Which subjects can students in {a['name']} study?",'a':'We can help arrange online Maths, Physics, Chemistry, Biology, English, Further Maths and other subjects from primary to A-Level, subject to tutor availability.'}, {'q':f"Do you have an office in {a['name']}?",'a':f"No. Wiltshire Tutoring provides online tuition. Our {a['name']} page describes a service area, not a physical tutoring office."}]
    render('detail.html',path,f"Online Tutors {a['name']} | GCSE Maths, Physics & A-Level",f"Online one-to-one Maths, Physics, English, GCSE and A-Level tutors for {a['name']}, Wiltshire. Experienced UK tutoring network. From £23/hr.",'area',crumbs=[('Home','/'),('Wiltshire Areas','/areas.html'),(a['name'],path)],faqs=fs,service=(f"Online GCSE, A-Level and Maths tutoring for {a['name']} students",'Live online tutoring',a['name']+', Wiltshire'),item=a,detail_type='areas',related=[x for x in areas if x['slug']!=a['slug']][:6],badge=f"{a['name'].upper()} · WILTSHIRE",feature_icon='bi-geo-alt')

render('blog-list.html','/blog.html','Tutoring Blog Wiltshire | GCSE Maths, Physics & Study Advice','Expert study advice for Wiltshire students and families: GCSE Maths revision, Physics tutoring, entrance exams and A-Level Maths support.','blog',crumbs=[('Home','/'),('Blog','/blog.html')])
for p in posts:
    path=f"/blog/{p['slug']}.html"
    render('blog-article.html',path,p['title']+' | Wiltshire Tutoring',p['excerpt'], 'article',crumbs=[('Home','/'),('Blog','/blog.html'),(p['title'],path)],article=p,post=p,related=[x for x in posts if x['slug']!=p['slug']][:3])

render('safeguarding.html','/safeguarding.html','Safeguarding & Child Protection | Wiltshire Tutoring','Our safeguarding and child protection approach for online tutoring, Designated Safeguarding Lead Jesse, and safeguarding@nwttutoring.com.','safeguarding',crumbs=[('Home','/'),('Safeguarding','/safeguarding.html')])
privacy_sections=[
{'heading':'1. Who we are','paragraphs':['Wiltshire Tutoring is a branch of North Wales Tutoring Group. For enquiries related to this website, contact wiltshire@nwttutoring.com. We provide online tutoring enquiry, matching and lesson administration services.']},
{'heading':'2. Information we collect','paragraphs':['When you submit an enquiry, we collect your name, email address, phone number and the message you send. You may also choose to provide learning stage, subject, exam board, availability and other relevant information. Please avoid including unnecessary sensitive personal information in your initial message.','Technical information such as IP addresses and browser details may be processed by our hosting, content-delivery providers or form service as part of providing and securing the website.']},
{'heading':'3. Why we use the information','paragraphs':['We use enquiry details to respond to your request, discuss tutoring, identify a suitable tutor, manage lessons where you book and maintain appropriate records. We may need to process data to take steps before entering a service agreement, to meet legal duties, or for legitimate operational interests such as service administration and security.','We do not add you to marketing emails merely because you send a tutoring enquiry.']},
{'heading':'4. Forms and third-party processors','paragraphs':['Our enquiry forms use Web3Forms to relay submissions to our email. Web3Forms states its processing servers are in the United States, so personal information submitted through the form may be transmitted internationally. We also load Google Fonts and SweetAlert scripts from external providers; Bootstrap styling and icon assets are hosted by this website.','Where applicable, we assess data-sharing arrangements and any international-transfer safeguards under UK data protection requirements.']},
{'heading':'5. Sharing and retention','paragraphs':['Relevant enquiry information may be shared with the members of our team or a prospective tutor where needed to assess suitability and provide the requested service. We do not sell your enquiry details.','We retain information for as long as reasonably required for the purpose, the tutoring relationship, safeguarding and legal obligations, then delete or anonymise where appropriate. Retention periods depend on the type of record.']},
{'heading':'6. Your rights','paragraphs':['Depending on your circumstances and applicable law, you may request access to or correction or deletion of your personal information, ask us to restrict or object to certain processing, and raise a complaint with the UK Information Commissioner’s Office (ICO).','For requests concerning your information, email wiltshire@nwttutoring.com.']},
{'heading':'7. Cookies and storage','paragraphs':['We use local browser storage for cookie preferences and to limit repeated or duplicate enquiries as part of spam prevention. We do not load optional analytics or advertising trackers on this version of the website. See our Cookie Policy for further detail.']},
{'heading':'8. Updates','paragraphs':['This policy may be updated as our services or website tools change. We review it when material changes are made.']}
]
cookie_sections=[
{'heading':'Essential website functionality','paragraphs':['This website uses localStorage under the key wiltshire_tutoring_cookie_choice_v1 to remember the visitor’s response to the cookie banner. Our contact form also uses sessionStorage and localStorage to reduce duplicate enquiries and repeated submissions in a short period. This preference can be cleared in your browser settings.','The site may also use technical storage necessary for delivery of the website, its security and normal browser operation.']},
{'heading':'Optional analytics and advertising','paragraphs':['No Google Analytics, Google Tag Manager, advertising pixel or other optional audience-tracking scripts are installed in this launch version. Accepting the banner does not activate any analytics service. We would update this notice and ask for appropriate consent before adding optional tracking.']},
{'heading':'Third-party resources','paragraphs':['The website loads Google Fonts and SweetAlert scripts from external providers. Our Bootstrap CSS/JavaScript and icon assets are hosted on this website. Our enquiry forms send information to Web3Forms only when you choose to submit them.','External services have their own privacy practices and may use technical cookies or logs necessary to provide their service.']},
{'heading':'Changing your preferences','paragraphs':['To reset the cookie banner, clear site data or localStorage for wiltshiretutors.com in your browser. You may also block optional cookies using your browser controls.']},
{'heading':'Questions','paragraphs':['For cookie or privacy questions, contact wiltshire@nwttutoring.com.']}
]
render('policy.html','/privacy-policy.html','Privacy Policy | Wiltshire Tutoring','How Wiltshire Tutoring handles enquiry details, personal information and third-party website services.','privacy',heading='Privacy Policy',intro='How we use and protect information you share when enquiring about online tutoring.',sections=privacy_sections)
render('policy.html','/cookie-policy.html','Cookie Policy | Wiltshire Tutoring','Information about cookie preferences, local storage and third-party website resources on wiltshiretutors.com.','cookie',heading='Cookie Policy',intro='A clear explanation of the storage and external services used on this website.',sections=cookie_sections)

render('not-found.html','/404.html','Page Not Found | Wiltshire Tutoring','We could not find this page. Explore tutoring subjects and contact Wiltshire Tutoring for online Maths, Physics, GCSE and A-Level support.','404')
built.remove('/404.html')

# Search-engine discovery; URLs correspond exactly to generated static files.
from xml.sax.saxutils import escape
xml=['<?xml version="1.0" encoding="UTF-8"?>','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for path in built:
    priority='1.0' if path=='/' else ('0.9' if path in ('/subjects.html','/exams.html','/areas.html','/contact.html') else '0.7')
    xml.append(f'<url><loc>{escape(SITE+path)}</loc><lastmod>2026-11-12</lastmod><changefreq>monthly</changefreq><priority>{priority}</priority></url>')
xml.append('</urlset>')
(ROOT/'sitemap.xml').write_text('\n'.join(xml)+'\n',encoding='utf-8')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://wiltshiretutors.com/sitemap.xml\n',encoding='utf-8')
(ROOT/'site.webmanifest').write_text(json.dumps({'name':'Wiltshire Tutoring','short_name':'Wiltshire Tutors','start_url':'/','display':'standalone','background_color':'#ffffff','theme_color':'#08065f','icons':[{'src':'/assets/images/favicon-192.png','sizes':'192x192','type':'image/png'},{'src':'/assets/images/favicon-512.png','sizes':'512x512','type':'image/png'}]},indent=2),encoding='utf-8')
print(f'Built {len(built)} pages, sitemap.xml and robots.txt')
