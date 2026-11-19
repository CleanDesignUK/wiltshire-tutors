/* Spam filter adapted from the supplied North Wales Tutoring form security script.
   Browser-side checks and provider honeypot reduce spam but do not replace server-side protection. */
document.addEventListener('DOMContentLoaded', function () {

  /* =========================================================
     WILTSHIRE TUTORING · NORTH WALES TUTORING GROUP
     STRICT FORM SECURITY + WEB3FORMS SUBMISSION

     Works with forms using:
     class="nwt-secure-form"

     Allowed:
     - Parent/student tutoring enquiries
     - Existing student support messages
     - Tutor job/application enquiries

     Blocked:
     - SEO
     - Marketing
     - Lead generation
     - Advertising
     - Backlinks
     - Guest posts
     - Website/web design sales
     - Business growth pitches
     - Vague cold outreach / sales messages
     - NWT-owned email addresses
     - Fake/sequential/repetitive phone numbers
  ========================================================= */


  const forms =
    document.querySelectorAll('.nwt-secure-form');


  if (!forms.length) {
    return;
  }



  /* =========================================================
     SETTINGS
  ========================================================= */

  const MAX_SUCCESSFUL_SUBMISSIONS = 3;

  const RATE_LIMIT_WINDOW =
    15 * 60 * 1000;

  const DUPLICATE_WINDOW =
    90 * 1000;



  /* =========================================================
     BLOCKED INTERNAL EMAIL DOMAINS
  ========================================================= */

  const blockedEmailDomains = [

    'nwttutoring.com',

    'northwalestutoring.com',

    'southwalestutoring.com',

    'northamptonshiretutoring.com',

    'wiltshiretutors.com',

    'lincolnshiretutoring.com',

    'cumbriatutoring.com'

  ];



  /* =========================================================
     ALERT / FEEDBACK
  ========================================================= */

  async function showMessage(
    type,
    title,
    message
  ) {

    if (
      window.Swal &&
      typeof window.Swal.fire === 'function'
    ) {

      await window.Swal.fire({

        icon: type,

        title: title,

        text: message,

        confirmButtonColor:
          '#ff28a8'

      });


      return;

    }


    alert(
      title +
      '\n\n' +
      message
    );

  }



  /* =========================================================
     NORMALISE TEXT
  ========================================================= */

  function normaliseText(value) {

    return String(
      value || ''
    )
      .replace(
        /\u200B/g,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  }



  /* =========================================================
     PHONE VALIDATION
  ========================================================= */


  function containsLongSequentialRun(
    digits
  ) {

    if (
      digits.length < 7
    ) {
      return false;
    }


    let ascendingRun = 1;

    let descendingRun = 1;


    for (
      let i = 1;
      i < digits.length;
      i++
    ) {

      const previous =
        Number(
          digits[i - 1]
        );


      const current =
        Number(
          digits[i]
        );


      /*
       * Ascending:
       * 0123456789
       * 1234567890
       */

      if (
        current ===
        (
          previous + 1
        ) % 10
      ) {

        ascendingRun++;

      } else {

        ascendingRun = 1;

      }


      /*
       * Descending:
       * 9876543210
       */

      if (
        current ===
        (
          previous + 9
        ) % 10
      ) {

        descendingRun++;

      } else {

        descendingRun = 1;

      }


      if (
        ascendingRun >= 7 ||
        descendingRun >= 7
      ) {

        return true;

      }

    }


    return false;

  }



  function isRepeatedPattern(
    digits
  ) {

    /*
     * Examples:
     *
     * 1212121212
     * 3434343434
     * 123123123123
     */


    for (
      let patternLength = 1;
      patternLength <= 4;
      patternLength++
    ) {

      if (
        digits.length <
        patternLength * 4
      ) {

        continue;

      }


      const pattern =
        digits.slice(
          0,
          patternLength
        );


      let rebuilt = '';


      while (
        rebuilt.length <
        digits.length
      ) {

        rebuilt += pattern;

      }


      rebuilt =
        rebuilt.slice(
          0,
          digits.length
        );


      if (
        rebuilt === digits
      ) {

        return true;

      }

    }


    return false;

  }



  function isValidPhone(
    rawPhone
  ) {

    const raw =
      normaliseText(
        rawPhone
      );


    if (!raw) {
      return false;
    }


    /*
     * Only allow normal telephone characters.
     */

    if (
      !/^[+\d\s().-]+$/.test(
        raw
      )
    ) {

      return false;

    }


    const digits =
      raw.replace(
        /\D/g,
        ''
      );


    /*
     * Standard international length.
     */

    if (
      digits.length < 7 ||
      digits.length > 15
    ) {

      return false;

    }


    /*
     * Reject all-identical numbers.
     *
     * 11111111111
     */

    if (
      /^(\d)\1+$/.test(
        digits
      )
    ) {

      return false;

    }


    /*
     * Reject 5 or more identical
     * digits consecutively.
     *
     * 07777712345
     * 11111234567
     */

    if (
      /(\d)\1{4,}/.test(
        digits
      )
    ) {

      return false;

    }


    /*
     * Reject long sequential numbers.
     *
     * 01234567891
     * 12345678901
     * 98765432109
     */

    if (
      containsLongSequentialRun(
        digits
      )
    ) {

      return false;

    }


    /*
     * Reject obvious repeated patterns.
     *
     * 1212121212
     * 123123123123
     */

    if (
      isRepeatedPattern(
        digits
      )
    ) {

      return false;

    }


    /*
     * Reject very low digit variety
     * in long numbers.
     *
     * 10101010101
     * 77777077777
     */

    const uniqueDigits =
      new Set(
        digits.split('')
      ).size;


    if (
      digits.length >= 9 &&
      uniqueDigits <= 2
    ) {

      return false;

    }


    return true;

  }



  /* =========================================================
     EMAIL VALIDATION
  ========================================================= */


  function splitEmail(
    rawEmail
  ) {

    const email =
      normaliseText(
        rawEmail
      )
        .toLowerCase();


    const atPosition =
      email.lastIndexOf(
        '@'
      );


    if (
      atPosition <= 0 ||
      atPosition ===
        email.length - 1
    ) {

      return null;

    }


    return {

      full:
        email,

      local:
        email.slice(
          0,
          atPosition
        ),

      domain:
        email.slice(
          atPosition + 1
        )

    };

  }



  function isBlockedEmail(
    rawEmail
  ) {

    const parsed =
      splitEmail(
        rawEmail
      );


    if (!parsed) {
      return true;
    }


    let local =
      parsed.local;


    const domain =
      parsed.domain;


    /*
     * Block all NWT-owned domains.
     *
     * Includes:
     *
     * hello@nwttutoring.com
     * fake+abc@nwttutoring.com
     * person@mail.nwttutoring.com
     */

    const internalDomain =
      blockedEmailDomains.some(
        function (
          blockedDomain
        ) {

          return (

            domain ===
              blockedDomain ||

            domain.endsWith(
              '.' +
              blockedDomain
            )

          );

        }
      );


    if (
      internalDomain
    ) {

      return true;

    }



    /*
     * Protect the NWT Gmail address.
     *
     * Gmail ignores:
     *
     * dots
     * plus aliases
     *
     * Therefore block:
     *
     * nwalestutoring@gmail.com
     *
     * n.wales.tutoring@gmail.com
     *
     * nwalestutoring+abc@gmail.com
     *
     * n.wales.tutoring+abc@googlemail.com
     */

    if (
      domain === 'gmail.com' ||
      domain === 'googlemail.com'
    ) {

      local =
        local.split(
          '+'
        )[0];


      local =
        local.replace(
          /\./g,
          ''
        );


      if (
        local ===
        'nwalestutoring'
      ) {

        return true;

      }

    }


    return false;

  }



  /* =========================================================
     REMOVE OUR BUSINESS NAMES BEFORE
     CHECKING FOR TUTORING INTENT
  ========================================================= */

  function cleanMessageForIntent(
    rawMessage
  ) {

    return normaliseText(
      rawMessage
    )

      .replace(
        /north\s+wales\s+tutoring(?:\s+group)?/gi,
        ' '
      )

      .replace(
        /south\s+wales\s+tutoring/gi,
        ' '
      )

      .replace(
        /southamptonshire\s+tutoring/gi,
        ' '
      )

      .replace(
        /wiltshire\s+tutors?/gi,
        ' '
      )

      .replace(
        /lincolnshire\s+tutoring/gi,
        ' '
      )

      .replace(
        /cumbria\s+tutoring/gi,
        ' '
      )

      .replace(
        /\s+/g,
        ' '
      )

      .trim();

  }



  /* =========================================================
     LEGITIMATE TUTOR APPLICATIONS

     These are ALLOWED.
  ========================================================= */

  function isTutorApplication(
    rawMessage
  ) {

    const message =
      normaliseText(
        rawMessage
      );


    const tutorIdentityPatterns = [

      /\btutor\b/i,

      /\btutoring experience\b/i,

      /\bteacher\b/i,

      /\bqualified teacher\b/i,

      /\bteaching assistant\b/i,

      /\blecturer\b/i,

      /\beducator\b/i,

      /\binstructor\b/i,

      /\bexaminer\b/i,

      /\bqts\b/i,

      /\bpgce\b/i

    ];


    const applicationPatterns = [

      /\bapply\b/i,

      /\bapplication\b/i,

      /\bapplying\b/i,

      /\bjob\b/i,

      /\bjobs\b/i,

      /\bvacancy\b/i,

      /\bvacancies\b/i,

      /\bjoin your team\b/i,

      /\bjoining your team\b/i,

      /\bjoin the team\b/i,

      /\bwork with you\b/i,

      /\bworking with you\b/i,

      /\bwork for you\b/i,

      /\bwork with your team\b/i,

      /\btutoring role\b/i,

      /\bteaching role\b/i,

      /\btutor role\b/i,

      /\bposition\b/i,

      /\bcontractor\b/i,

      /\bself[- ]?employed\b/i,

      /\bsend my cv\b/i,

      /\bsubmit my cv\b/i,

      /\bmy cv\b/i,

      /\bresume\b/i,

      /\brésumé\b/i,

      /\btutoring opportunity\b/i,

      /\bteaching opportunity\b/i

    ];


    const hasTutorIdentity =
      tutorIdentityPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      );


    const hasApplicationIntent =
      applicationPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      );


    return (
      hasTutorIdentity &&
      hasApplicationIntent
    );

  }



  /* =========================================================
     GENUINE TUTORING ENQUIRY
  ========================================================= */

  function hasTutoringIntent(
    rawMessage
  ) {

    /*
     * Remove NWT's business names first.
     *
     * This stops:
     *
     * "I can grow North Wales Tutoring"
     *
     * from passing merely because
     * "Tutoring" appears in our name.
     */

    const message =
      cleanMessageForIntent(
        rawMessage
      );


    const tutoringPatterns = [

      /\btutor\b/i,

      /\btutoring\b/i,

      /\btuition\b/i,

      /\blesson\b/i,

      /\blessons\b/i,

      /\bstudent\b/i,

      /\bstudents\b/i,

      /\bpupil\b/i,

      /\bpupils\b/i,

      /\bchild\b/i,

      /\bchildren\b/i,

      /\bmy daughter\b/i,

      /\bmy son\b/i,

      /\bdaughter\b/i,

      /\bson\b/i,

      /\bschool\b/i,

      /\bprimary\b/i,

      /\bsecondary\b/i,

      /\byear [1-9]\b/i,

      /\byear 1[0-3]\b/i,

      /\bks1\b/i,

      /\bks2\b/i,

      /\bks3\b/i,

      /\bks4\b/i,

      /\bgcse\b/i,

      /\ba[- ]?level\b/i,

      /\bsats\b/i,

      /\b11\+\b/i,

      /\b13\+\b/i,

      /\bucat\b/i,

      /\btmua\b/i,

      /\bmaths\b/i,

      /\bmathematics\b/i,

      /\benglish\b/i,

      /\bwelsh\b/i,

      /\bcymraeg\b/i,

      /\bbiology\b/i,

      /\bchemistry\b/i,

      /\bphysics\b/i,

      /\bscience\b/i,

      /\bcombined science\b/i,

      /\bbusiness studies\b/i,

      /\beconomics\b/i,

      /\bhistory\b/i,

      /\bgeography\b/i,

      /\bpsychology\b/i,

      /\bfrench\b/i,

      /\bspanish\b/i,

      /\bgerman\b/i,

      /\bexam\b/i,

      /\bexams\b/i,

      /\brevision\b/i,

      /\brevise\b/i,

      /\bhomework\b/i,

      /\bwjec\b/i,

      /\bcbac\b/i,

      /\baqa\b/i,

      /\bedexcel\b/i,

      /\bocr\b/i,

      /\beduqas\b/i,

      /\bcaie\b/i,

      /\bfunctional skills\b/i,

      /\bresit\b/i,

      /\bresits\b/i,

      /\buniversity\b/i,

      /\blearning\b/i,

      /\bstudying\b/i,

      /\bteacher\b/i,

      /\bgrade\b/i,

      /\bgrades\b/i,

      /\bcoursework\b/i,

      /\bmock exam\b/i,

      /\bmock exams\b/i,

      /\bmocks\b/i,

      /\bcurriculum\b/i,

      /\bsubject\b/i,

      /\bsubjects\b/i,

      /\bexam board\b/i,

      /\bexam boards\b/i,

      /\bconfidence\b/i,

      /\bschoolwork\b/i

    ];


    return tutoringPatterns.some(
      function (
        pattern
      ) {

        return pattern.test(
          message
        );

      }
    );

  }



  /* =========================================================
     HARD SALES / PROMOTION
  ========================================================= */

  function containsHardPromotion(
    rawMessage
  ) {

    const message =
      normaliseText(
        rawMessage
      );


    const patterns = [

      /* SEO */

      /\bseo\b/i,

      /\bsearch engine optimisation\b/i,

      /\bsearch engine optimization\b/i,

      /\bgoogle ranking\b/i,

      /\brank your website\b/i,

      /\brank the website\b/i,

      /\bwebsite rankings?\b/i,

      /\brank higher\b/i,

      /\bfirst page of google\b/i,

      /\borganic traffic\b/i,

      /\bdomain authority\b/i,



      /* Backlinks */

      /\bbacklinks?\b/i,

      /\blink building\b/i,

      /\bguest posts?\b/i,

      /\bguest articles?\b/i,

      /\bsponsored posts?\b/i,

      /\bpaid posts?\b/i,



      /* Web development */

      /\bweb design\b/i,

      /\bwebsite design\b/i,

      /\bwebsite redesign\b/i,

      /\bweb development\b/i,

      /\bwebsite development\b/i,

      /\bapp development\b/i,

      /\bmobile app development\b/i,

      /\bsoftware development services?\b/i,



      /* Marketing */

      /\bdigital marketing\b/i,

      /\bmarketing agency\b/i,

      /\bmarketing services?\b/i,

      /\bsocial media marketing\b/i,

      /\bemail marketing\b/i,

      /\bcontent marketing\b/i,

      /\bmarketing campaign\b/i,



      /* Leads */

      /\blead generation\b/i,

      /\bgenerate more leads\b/i,

      /\bgenerate leads\b/i,

      /\bqualified leads\b/i,

      /\bmore leads\b/i,



      /* Advertising */

      /\bgoogle ads?\b/i,

      /\bfacebook ads?\b/i,

      /\bmeta ads?\b/i,

      /\bpaid ads?\b/i,

      /\bpaid advertising\b/i,

      /\badvertising services?\b/i,

      /\bad campaigns?\b/i,



      /* Cold outreach */

      /\bappointment setting\b/i,

      /\bcold outreach\b/i,

      /\bcold email\b/i,

      /\bcold emailing\b/i,

      /\bcold calling\b/i,



      /* Explicit sales */

      /\bpromote your business\b/i,

      /\bpromote your website\b/i,

      /\bpromote your company\b/i,

      /\bpromote your brand\b/i,

      /\bgrow your business\b/i,

      /\bgrow your website\b/i,

      /\bgrow your company\b/i,

      /\bgrow your brand\b/i,

      /\bboost your traffic\b/i,

      /\bincrease your traffic\b/i,

      /\bboost your sales\b/i,

      /\bincrease your sales\b/i,

      /\bincrease your revenue\b/i,

      /\bboost your revenue\b/i

    ];


    return patterns.some(
      function (
        pattern
      ) {

        return pattern.test(
          message
        );

      }
    );

  }



  /* =========================================================
     SOFT / VAGUE SALES PITCH DETECTION

     Designed to catch things such as:

     "Hi, I can show you where North Wales Tutoring's
     best customers are finding you, so you can put more
     money behind it. Should I send it over?"
  ========================================================= */

  function getSoftPromotionScore(
    rawMessage
  ) {

    const message =
      normaliseText(
        rawMessage
      );


    let score = 0;



    /* ---------------------------------------------------------
       CUSTOMER / CLIENT ACQUISITION LANGUAGE
    --------------------------------------------------------- */

    const customerPatterns = [

      /\bbest customers?\b/i,

      /\bideal customers?\b/i,

      /\bpotential customers?\b/i,

      /\bnew customers?\b/i,

      /\bmore customers?\b/i,

      /\bcustomer acquisition\b/i,

      /\bcustomer journey\b/i,

      /\bwhere .*customers?.*finding you\b/i,

      /\bwhere .*clients?.*finding you\b/i,

      /\bwhere .*customers?.*find you\b/i,

      /\bwhere .*clients?.*find you\b/i,

      /\bwhere .*enquiries?.*come from\b/i,

      /\bwhere .*leads?.*come from\b/i,

      /\bwhere your customers come from\b/i,

      /\bwhere your clients come from\b/i

    ];


    if (
      customerPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 2;

    }



    /* ---------------------------------------------------------
       MONEY / AD SPEND / ROI
    --------------------------------------------------------- */

    const moneyPatterns = [

      /\bput more money behind\b/i,

      /\bput money behind\b/i,

      /\bspend more on\b/i,

      /\bad spend\b/i,

      /\badvertising spend\b/i,

      /\bmarketing spend\b/i,

      /\badvertising budget\b/i,

      /\bmarketing budget\b/i,

      /\breturn on investment\b/i,

      /\broi\b/i,

      /\bconversion rate\b/i,

      /\bconversion rates\b/i,

      /\bacquisition cost\b/i,

      /\bcost per lead\b/i,

      /\bcost per customer\b/i

    ];


    if (
      moneyPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 2;

    }



    /* ---------------------------------------------------------
       COLD PITCH OPENERS
    --------------------------------------------------------- */

    const pitchPatterns = [

      /\bi can show you\b/i,

      /\bi could show you\b/i,

      /\bi wanted to show you\b/i,

      /\bi(?:'ve| have) found\b/i,

      /\bi noticed\b/i,

      /\bi(?:'ve| have) noticed\b/i,

      /\bi took a look at\b/i,

      /\bi had a look at\b/i,

      /\bi analysed\b/i,

      /\bi analyzed\b/i,

      /\bi prepared\b/i,

      /\bi put together\b/i,

      /\bi have some ideas\b/i,

      /\bi have an idea\b/i,

      /\bi spotted\b/i,

      /\bquick suggestion\b/i,

      /\bquick idea\b/i,

      /\bquick question\b/i,

      /\bthought this might be useful\b/i

    ];


    if (
      pitchPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 1;

    }



    /* ---------------------------------------------------------
       SALES CTA
    --------------------------------------------------------- */

    const salesCtaPatterns = [

      /\bshould i send it over\b/i,

      /\bshall i send it over\b/i,

      /\bshould i send this over\b/i,

      /\bshall i send this over\b/i,

      /\bwant me to send\b/i,

      /\bwould you like me to send\b/i,

      /\bcan i send it\b/i,

      /\bcan i send this\b/i,

      /\bcan i send that\b/i,

      /\bshould i send you\b/i,

      /\bshall i send you\b/i,

      /\bcan i share it\b/i,

      /\bcan i share this\b/i,

      /\bwould you like to see\b/i,

      /\binterested in seeing\b/i,

      /\binterested in learning more\b/i,

      /\bopen to a quick call\b/i,

      /\bopen to a call\b/i,

      /\bopen to chatting\b/i,

      /\bbook a quick call\b/i,

      /\b10[- ]minute call\b/i,

      /\b15[- ]minute call\b/i,

      /\b20[- ]minute call\b/i,

      /\bjump on a call\b/i,

      /\bschedule a call\b/i

    ];


    if (
      salesCtaPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 1;

    }



    /* ---------------------------------------------------------
       BUSINESS GROWTH LANGUAGE
    --------------------------------------------------------- */

    const growthPatterns = [

      /\bgrow your business\b/i,

      /\bgrow the business\b/i,

      /\bmore revenue\b/i,

      /\bincrease revenue\b/i,

      /\bmore sales\b/i,

      /\bincrease sales\b/i,

      /\bmore bookings\b/i,

      /\bincrease bookings\b/i,

      /\bmore enquiries\b/i,

      /\bincrease enquiries\b/i,

      /\bmore inquiries\b/i,

      /\bincrease inquiries\b/i,

      /\bget more clients\b/i,

      /\bmore clients\b/i,

      /\bget more customers\b/i,

      /\bmore customers\b/i,

      /\bmore website traffic\b/i,

      /\bwebsite traffic\b/i,

      /\bmarketing strategy\b/i,

      /\bgrowth strategy\b/i,

      /\bacquisition strategy\b/i,

      /\bbusiness growth\b/i,

      /\bscale your business\b/i

    ];


    if (
      growthPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 2;

    }



    /* ---------------------------------------------------------
       UNSOLICITED SERVICE LANGUAGE
    --------------------------------------------------------- */

    const servicePitchPatterns = [

      /\bwe help businesses\b/i,

      /\bi help businesses\b/i,

      /\bwe help companies\b/i,

      /\bi help companies\b/i,

      /\bwe specialise in helping\b/i,

      /\bwe specialize in helping\b/i,

      /\bour services\b/i,

      /\bour service can\b/i,

      /\bwe offer\b/i,

      /\bi offer\b/i,

      /\bwe provide services\b/i,

      /\bi provide services\b/i

    ];


    if (
      servicePitchPatterns.some(
        function (
          pattern
        ) {

          return pattern.test(
            message
          );

        }
      )
    ) {

      score += 2;

    }



    return score;

  }



  function containsSoftPromotion(
    message
  ) {

    /*
     * Threshold intentionally strict.
     *
     * Elliott message:
     *
     * "I can show you"             +1
     * "best customers"             +2
     * "put more money behind"      +2
     * "should I send it over?"     +1
     *
     * TOTAL = 6
     *
     * Block threshold = 2
     */

    return (
      getSoftPromotionScore(
        message
      ) >= 2
    );

  }



  /* =========================================================
     LINK DETECTION
  ========================================================= */

  function containsExcessiveLinks(
    rawMessage
  ) {

    const message =
      normaliseText(
        rawMessage
      );


    const links =
      message.match(
        /(?:https?:\/\/|www\.)\S+/gi
      ) || [];


    return (
      links.length >= 2
    );

  }



  /* =========================================================
     EMAIL ADDRESS IN MESSAGE

     Sales spammers often put another email address
     directly in the message.
  ========================================================= */

  function countEmailsInMessage(
    rawMessage
  ) {

    const matches =
      normaliseText(
        rawMessage
      ).match(
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
      ) || [];


    return matches.length;

  }



  /* =========================================================
     FINAL MESSAGE VALIDATION
  ========================================================= */

  function validateMessage(
    rawMessage
  ) {

    const message =
      normaliseText(
        rawMessage
      );


    /* ---------------------------------------------------------
       LENGTH
    --------------------------------------------------------- */

    if (
      message.length < 10
    ) {

      return {

        valid: false,

        reason:
          'Please provide a little more information about your enquiry.'

      };

    }


    if (
      message.length > 2000
    ) {

      return {

        valid: false,

        reason:
          'Your message is too long. Please shorten it and try again.'

      };

    }



    /* ---------------------------------------------------------
       HARD PROMOTIONAL SPAM
    --------------------------------------------------------- */

    if (
      containsHardPromotion(
        message
      )
    ) {

      return {

        valid: false,

        reason:
          'This form is for tutoring enquiries and tutor applications only. Sales, marketing and promotional messages cannot be submitted.'

      };

    }



    /* ---------------------------------------------------------
       SOFT / VAGUE SALES SPAM
    --------------------------------------------------------- */

    if (
      containsSoftPromotion(
        message
      )
    ) {

      return {

        valid: false,

        reason:
          'This form is for tutoring enquiries and tutor applications only. Sales, marketing and promotional messages cannot be submitted.'

      };

    }



    /* ---------------------------------------------------------
       TUTOR APPLICATIONS ARE LEGITIMATE
    --------------------------------------------------------- */

    if (
      isTutorApplication(
        message
      )
    ) {

      return {
        valid: true
      };

    }



    /* ---------------------------------------------------------
       MULTIPLE LINKS
    --------------------------------------------------------- */

    if (
      containsExcessiveLinks(
        message
      )
    ) {

      return {

        valid: false,

        reason:
          'Please remove promotional links and submit only information relevant to your enquiry.'

      };

    }



    /* ---------------------------------------------------------
       TOO MANY EMAIL ADDRESSES IN MESSAGE
    --------------------------------------------------------- */

    if (
      countEmailsInMessage(
        message
      ) >= 2
    ) {

      return {

        valid: false,

        reason:
          'Please remove promotional contact details and submit only information relevant to your enquiry.'

      };

    }



    /* ---------------------------------------------------------
       MUST BE EDUCATION/TUTORING RELATED
    --------------------------------------------------------- */

    if (
      !hasTutoringIntent(
        message
      )
    ) {

      return {

        valid: false,

        reason:
          'Please tell us what tutoring support you need, or let us know if you are a tutor interested in joining our team.'

      };

    }



    return {
      valid: true
    };

  }



  /* =========================================================
     LOCAL RATE LIMIT STORAGE
  ========================================================= */

  function getSuccessfulSubmissionTimes() {

    try {

      const value =
        localStorage.getItem(
          'wiltshireSecureFormSuccessfulSubmissions'
        );


      if (!value) {
        return [];
      }


      const parsed =
        JSON.parse(
          value
        );


      if (
        !Array.isArray(
          parsed
        )
      ) {

        return [];

      }


      return parsed.filter(
        function (
          timestamp
        ) {

          return (
            Number.isFinite(
              Number(
                timestamp
              )
            )
          );

        }
      );


    } catch (
      error
    ) {

      return [];

    }

  }



  function isRateLimited() {

    const now =
      Date.now();


    const recent =
      getSuccessfulSubmissionTimes()
        .filter(
          function (
            timestamp
          ) {

            return (

              now -
              Number(
                timestamp
              )

            ) <
            RATE_LIMIT_WINDOW;

          }
        );


    try {

      localStorage.setItem(

        'wiltshireSecureFormSuccessfulSubmissions',

        JSON.stringify(
          recent
        )

      );

    } catch (
      error
    ) {

      /*
       * Ignore localStorage errors.
       */

    }


    return (
      recent.length >=
      MAX_SUCCESSFUL_SUBMISSIONS
    );

  }



  function recordSuccessfulSubmission() {

    const now =
      Date.now();


    const recent =
      getSuccessfulSubmissionTimes()
        .filter(
          function (
            timestamp
          ) {

            return (

              now -
              Number(
                timestamp
              )

            ) <
            RATE_LIMIT_WINDOW;

          }
        );


    recent.push(
      now
    );


    try {

      localStorage.setItem(

        'wiltshireSecureFormSuccessfulSubmissions',

        JSON.stringify(
          recent
        )

      );

    } catch (
      error
    ) {

      /*
       * Ignore storage error.
       */

    }

  }



  /* =========================================================
     DUPLICATE SUBMISSION
  ========================================================= */

  function getFormSignature(
    form
  ) {

    const data =
      new FormData(
        form
      );


    const pieces = [];


    data.forEach(
      function (
        value,
        key
      ) {

        /*
         * Ignore technical fields.
         */

        if (
          key === 'access_key' ||
          key === 'botcheck'
        ) {

          return;

        }


        pieces.push(

          key +
          ':' +
          normaliseText(
            value
          )
            .toLowerCase()

        );

      }
    );


    pieces.sort();


    return pieces.join(
      '|'
    );

  }



  function isRecentDuplicate(
    form
  ) {

    let previousSignature = '';

    let previousTime = 0;


    try {

      previousSignature =
        sessionStorage.getItem(
          'wiltshireSecureLastFormSignature'
        ) || '';


      previousTime =
        Number(
          sessionStorage.getItem(
            'wiltshireSecureLastFormTime'
          ) || 0
        );


    } catch (
      error
    ) {

      return false;

    }


    const currentSignature =
      getFormSignature(
        form
      );


    return (

      currentSignature ===
        previousSignature &&

      (
        Date.now() -
        previousTime
      ) <
        DUPLICATE_WINDOW

    );

  }



  function recordSubmissionSignature(
    form
  ) {

    try {

      sessionStorage.setItem(

        'wiltshireSecureLastFormSignature',

        getFormSignature(
          form
        )

      );


      sessionStorage.setItem(

        'wiltshireSecureLastFormTime',

        String(
          Date.now()
        )

      );


    } catch (
      error
    ) {

      /*
       * Ignore storage errors.
       */

    }

  }



  /* =========================================================
     FORM SUBMISSION
  ========================================================= */

  forms.forEach(
    function (
      form
    ) {

      let submissionInProgress =
        false;


      form.addEventListener(
        'submit',
        async function (
          event
        ) {

          event.preventDefault();



          /* =================================================
             NATIVE HTML VALIDATION
          ================================================= */

          if (
            !form.checkValidity()
          ) {

            form.reportValidity();

            return;

          }



          /* =================================================
             STOP DOUBLE CLICK / DOUBLE SUBMIT
          ================================================= */

          if (
            submissionInProgress
          ) {

            return;

          }



          /* =================================================
             BOTCHECK HONEYPOT
          ================================================= */

          const botcheck =
            form.querySelector(
              'input[name="botcheck"]'
            );


          if (
            botcheck &&
            botcheck.checked
          ) {

            /*
             * Silently reject likely bots.
             */

            return;

          }



          const formType =
            form.dataset.formType ||
            'phone-only';


          const submitButton =
            form.querySelector(
              'button[type="submit"]'
            );


          const phone =
            form.querySelector(
              'input[name="phone"]'
            );


          const email =
            form.querySelector(
              'input[name="email"]'
            );


          const message =
            form.querySelector(
              'textarea[name="message"]'
            );



          /* =================================================
             PHONE
          ================================================= */

          if (phone) {

            const phoneValue =
              normaliseText(
                phone.value
              );


            const phoneRequired =

              phone.required ||

              formType ===
                'phone-only';


            if (
              phoneRequired &&
              !phoneValue
            ) {

              await showMessage(

                'error',

                'Phone number required',

                'Please enter your phone number.'

              );


              phone.focus();

              return;

            }


            if (
              phoneValue &&
              !isValidPhone(
                phoneValue
              )
            ) {

              await showMessage(

                'error',

                'Invalid phone number',

                'Please enter a genuine phone number. Sequential, repetitive and placeholder numbers are not accepted.'

              );


              phone.focus();

              return;

            }

          }



          /* =================================================
             EMAIL
          ================================================= */

          if (email) {

            const emailValue =
              normaliseText(
                email.value
              );


            if (
              !emailValue ||
              !email.checkValidity()
            ) {

              await showMessage(

                'error',

                'Invalid email address',

                'Please enter a valid email address.'

              );


              email.focus();

              return;

            }


            if (
              isBlockedEmail(
                emailValue
              )
            ) {

              await showMessage(

                'error',

                'Email address not accepted',

                'Please use your own personal or work email address rather than an email address belonging to North Wales Tutoring or one of our associated tutoring websites.'

              );


              email.focus();

              return;

            }

          }



          /* =================================================
             MESSAGE
          ================================================= */

          if (message) {

            const result =
              validateMessage(
                message.value
              );


            if (
              !result.valid
            ) {

              await showMessage(

                'error',

                'Message not accepted',

                result.reason

              );


              message.focus();

              return;

            }

          }



          /* =================================================
             RATE LIMIT
          ================================================= */

          if (
            isRateLimited()
          ) {

            await showMessage(

              'error',

              'Too many submissions',

              'Too many enquiries have been submitted from this browser. Please try again later or contact us by WhatsApp.'

            );


            return;

          }



          /* =================================================
             DUPLICATE
          ================================================= */

          if (
            isRecentDuplicate(
              form
            )
          ) {

            await showMessage(

              'error',

              'Already submitted',

              'This enquiry was submitted recently. Please wait before sending the same enquiry again.'

            );


            return;

          }



          /* =================================================
             PREPARE SUBMISSION
          ================================================= */

          submissionInProgress =
            true;


          if (
            submitButton
          ) {

            submitButton.disabled =
              true;


            submitButton.setAttribute(

              'aria-disabled',

              'true'

            );

          }



          try {


            /* ===============================================
               WEB3FORMS
            =============================================== */

            const response =
              await fetch(

                form.action,

                {

                  method:
                    'POST',

                  body:
                    new FormData(
                      form
                    ),

                  headers: {

                    'Accept':
                      'application/json'

                  }

                }

              );



            let result;


            try {

              result =
                await response.json();

            } catch (
              error
            ) {

              throw new Error(
                'Invalid response received from Web3Forms.'
              );

            }



            if (
              !response.ok ||
              !result.success
            ) {

              throw new Error(

                (
                  result &&
                  result.message
                )

                  ?

                  result.message

                  :

                  'Web3Forms submission failed.'

              );

            }



            /* ===============================================
               RECORD SUCCESS
            =============================================== */

            recordSuccessfulSubmission();


            recordSubmissionSignature(
              form
            );



            /* ===============================================
               GA4 LEAD EVENT
            =============================================== */

            if (
              typeof window.gtag ===
              'function'
            ) {

              window.gtag(

                'event',

                'generate_lead',

                {

                  send_to:
                    'G-K1S5V5LRN8',

                  form_name:
                    form.dataset.formName ||
                    'website_form',

                  form_location:
                    form.dataset.formLocation ||
                    window.location.pathname

                }

              );

            }



            /* ===============================================
               SUCCESS
            =============================================== */

            await showMessage(

              'success',

              'Thank you!',

              'Your enquiry has been received. Our team will be in touch with you shortly.'

            );


            form.reset();


          } catch (
            error
          ) {


            console.error(

              'Wiltshire Tutoring form submission error:',

              error

            );


            await showMessage(

              'error',

              'Submission error',

              'Something went wrong while sending your enquiry. Please try again or contact us on WhatsApp.'

            );


          } finally {


            submissionInProgress =
              false;


            if (
              submitButton
            ) {

              submitButton.disabled =
                false;


              submitButton.removeAttribute(
                'aria-disabled'
              );

            }

          }

        }

      );

    }

  );

});
