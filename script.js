const { gsap: { registerPlugin, set, to, timeline, utils: { random } }, MorphSVGPlugin, Draggable } = window;
registerPlugin(MorphSVGPlugin);

// Used to calculate distance of "tug"
let startX;
let startY;

const CORD_DURATION = 0.1;
const INPUT = document.querySelector('#light-mode');
const ARMS = document.querySelectorAll('.bear__arm');
const PAW = document.querySelector('.bear__paw');
const CORDS = document.querySelectorAll('.toggle-scene__cord');
const HIT = document.querySelector('.toggle-scene__hit-spot');
const DUMMY = document.querySelector('.toggle-scene__dummy-cord');
const DUMMY_CORD = document.querySelector('.toggle-scene__dummy-cord line');
const PROXY = document.createElement('div');
const endY = DUMMY_CORD.getAttribute('y2');
const endX = DUMMY_CORD.getAttribute('x2');

// Set init position
const RESET = () => {
  set(PROXY, { x: endX, y: endY });
};

// Audio files
const AUDIO = {
  BEAR_LONG: new Audio('/clip/bear-groan-long.mp3'),
  BEAR_SHORT: new Audio('/clip/bear-groan-short.mp3'),
  DOOR_OPEN: new Audio('/clip/door-open.mp3'),
  DOOR_CLOSE: new Audio('/clip/door-close.mp3'),
  CLICK: new Audio('/clip/click.mp3')
};

// Initial state
const STATE = {
  ON: false,
  ANGER: 0
};

// Set initial positions
set(PAW, {
  transformOrigin: '50% 50%',
  xPercent: -30
});
set('.bulb', { z: 10 });
set(ARMS, {
  xPercent: 10,
  rotation: -90,
  transformOrigin: '100% 50%',
  yPercent: -2,
  display: 'block'
});
set('.bear__brows', { display: 'none' });
set('.bear', {
  rotate: -50,
  xPercent: 40,
  transformOrigin: '50% 50%',
  scale: 0,
  display: 'block'
});
RESET();

// Timeline for cord animation
const CORD_TL = () => {
  const TL = timeline({
    paused: false,
    onStart: () => {
      STATE.ON = !STATE.ON;
      INPUT.checked = !STATE.ON;
      set(document.documentElement, { '--on': STATE.ON ? 1 : 0 });
      set([DUMMY], { display: 'none' });
      set(CORDS[0], { display: 'block' });
      AUDIO.CLICK.play();
    },
    onComplete: () => {
      set([DUMMY], { display: 'block' });
      set(CORDS[0], { display: 'none' });
      RESET();
    }
  });

  for (let i = 1; i < CORDS.length; i++) {
    TL.add(
      to(CORDS[0], {
        morphSVG: CORDS[i],
        duration: CORD_DURATION,
        repeat: 1,
        yoyo: true
      })
    );
  }
  return TL;
};

// Timeline for bear animation
const BEAR_TL = () => {
  const ARM_SWING = STATE.ANGER > 4 ? 0.2 : 0.4;
  const SLIDE = STATE.ANGER > 7 ? 0.2 : random(0.2, 0.6);
  const CLOSE_DELAY = STATE.ANGER >= 1 ? random(0.2, 2) : 0;
  const TL = timeline({
    paused: false
  })
    .to('.door', {
      onStart: () => AUDIO.DOOR_OPEN.play(),
      rotateY: 25,
      duration: 0.2
    })
    .add(
      STATE.ANGER >= 2 && Math.random() > 0.25
        ? to('.bear', {
            onStart: () => {
              if (Math.random() > 0.5) {
                AUDIO.BEAR_LONG.play();
              } else {
                AUDIO.BEAR_SHORT.play();
              }
              set('.bear', { scale: 1 });
            },
            xPercent: -55,
            repeat: 1,
            repeatDelay: 1,
            yoyo: true,
            duration: SLIDE
          })
        : () => {}
    )
    .to(ARMS, {
      delay: CLOSE_DELAY,
      duration: ARM_SWING,
      rotation: 0,
      xPercent: 0,
      yPercent: 0
    })
    .to(
      [PAW, '#knuckles'],
      {
        duration: 0.1,
        xPercent: (_, target) => (target.id === 'knuckles' ? 10 : 0)
      },
      '<-0.2'
    )
    .to(ARMS, {
      duration: ARM_SWING * 0.5,
      rotation: 5
    })
    .to(ARMS, {
      rotation: -90,
      xPercent: 10,
      duration: ARM_SWING,
      onComplete: () => {
        to('.door', {
          onComplete: () => AUDIO.DOOR_CLOSE.play(),
          duration: 0.2,
          rotateY: 0
        });
      }
    })
    .to(
      DUMMY_CORD,
      {
        duration: 0.1,
        attr: {
          x2: parseInt(endX, 10) + 20,
          y2: parseInt(endY, 10) + 60
        }
      },
      '<'
    )
    .to(
      DUMMY_CORD,
      {
        duration: 0.1,
        attr: {
          x2: endX,
          y2: endY
        }
      },
      '>'
    )
    .to(
      [PAW, '#knuckles'],
      {
        duration: 0.1,
        xPercent: (_, target) => (target.id === 'knuckles' ? 0 : -28)
      },
      '<'
    )
    .add(() => CORD_TL(), '<');
  return TL;
};

const IMPOSSIBLE_TL = () =>
  timeline({
    onStart: () => set(HIT, { display: 'none' }),
    onComplete: () => {
      set(HIT, { display: 'block' });
      if (Math.random() > 0) STATE.ANGER = STATE.ANGER + 1;
      if (STATE.ANGER >= 4) set('.bear__brows', { display: 'block' });
    }
  }).add(CORD_TL()).add(BEAR_TL());

Draggable.create(PROXY, {
  trigger: HIT,
  type: 'x,y',
  onPress: e => {
    startX = e.x;
    startY = e.y;
    RESET();
  },
  onDrag: function () {
    set(DUMMY_CORD, {
      attr: {
        x2: this.x,
        y2: this.y
      }
    });
  },
  onRelease: function (e) {
    const DISTX = Math.abs(e.x - startX);
    const DISTY = Math.abs(e.y - startY);
    const TRAVELLED = Math.sqrt(DISTX * DISTX + DISTY * DISTY);
    to(DUMMY_CORD, {
      attr: { x2: endX, y2: endY },
      duration: CORD_DURATION,
      onComplete: () => {
        if (TRAVELLED > 50) {
          IMPOSSIBLE_TL();
        } else {
          RESET();
        }
      }
    });
  }
});
