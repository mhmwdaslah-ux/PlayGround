const ACTIONS = ['pass', 'through', 'shoot', 'sprint', 'switch', 'tackle']

const KEYMAPS = {
  classic: {
    0: {
      KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
      Space: 'shoot', KeyE: 'pass', KeyQ: 'through', ShiftLeft: 'sprint', KeyF: 'switch', KeyC: 'tackle'
    },
    1: {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      Enter: 'shoot', Period: 'pass', Comma: 'through', ShiftRight: 'sprint', Slash: 'switch', Backslash: 'tackle'
    }
  },
  alternate: {
    0: {
      KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
      KeyJ: 'shoot', KeyK: 'pass', KeyL: 'through', ShiftLeft: 'sprint', KeyU: 'switch', KeyH: 'tackle'
    },
    1: {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      Enter: 'shoot', Period: 'pass', Comma: 'through', ShiftRight: 'sprint', Slash: 'switch', Backslash: 'tackle'
    }
  }
}

const GAMEPAD_BUTTONS = {
  pass: [0],
  shoot: [1],
  through: [2],
  switch: [3],
  tackle: [4, 6],
  sprint: [5, 7]
}

function emptyActions() {
  return Object.fromEntries(ACTIONS.map((action) => [action, false]))
}

export class InputController {
  constructor() {
    this.down = new Set()
    this.pressed = new Set()
    this.released = new Set()
    this.gamepads = [{}, {}]
    this.touch = {
      active: false,
      x: 0,
      z: 0,
      pointerId: null,
      actions: emptyActions(),
      pressed: new Set(),
      released: new Set()
    }
    this.onActivity = null
    this.initializeKeyboard()
  }

  initializeKeyboard() {
    window.addEventListener('keydown', (event) => {
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (!this.down.has(event.code)) {
        this.pressed.add(event.code)
        this.onActivity?.()
      }
      this.down.add(event.code)
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.code)) event.preventDefault()
    })
    window.addEventListener('keyup', (event) => {
      this.down.delete(event.code)
      this.released.add(event.code)
    })
    window.addEventListener('blur', () => {
      this.down.clear()
      this.released.clear()
      this.pressed.clear()
      this.touch.active = false
      this.touch.pointerId = null
      this.touch.x = 0
      this.touch.z = 0
    })
  }

  bindTouch(controls, joystick, knob) {
    if (!controls) return
    const actions = controls.querySelectorAll('[data-action]')
    actions.forEach((button) => {
      const action = button.dataset.action
      const start = (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.onActivity?.()
        if (!this.touch.actions[action]) this.touch.pressed.add(action)
        this.touch.actions[action] = true
        button.classList.add('is-down')
        try { button.setPointerCapture?.(event.pointerId) } catch { /* Synthetic pointers cannot be captured. */ }
      }
      const end = (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (this.touch.actions[action]) this.touch.released.add(action)
        this.touch.actions[action] = false
        button.classList.remove('is-down')
      }
      button.addEventListener('pointerdown', start)
      button.addEventListener('pointerup', end)
      button.addEventListener('pointercancel', end)
      button.addEventListener('lostpointercapture', end)
    })

    if (!joystick) return
    const radius = 46
    const deadZone = 0.14
    const updateFromPointer = (event) => {
      const rect = joystick.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = event.clientX - cx
      let dy = event.clientY - cy
      const length = Math.hypot(dx, dy)
      if (length > radius) {
        dx = (dx / length) * radius
        dy = (dy / length) * radius
      }
      const magnitude = Math.min(1, Math.hypot(dx, dy) / radius)
      const strength = magnitude <= deadZone ? 0 : (magnitude - deadZone) / (1 - deadZone)
      if (magnitude > 0.001 && strength > 0) {
        this.touch.x = (dx / length) * strength
        this.touch.z = (-dy / length) * strength
      } else {
        this.touch.x = 0
        this.touch.z = 0
      }
      if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`
    }
    const start = (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.onActivity?.()
      this.touch.active = true
      this.touch.pointerId = event.pointerId
      try { joystick.setPointerCapture?.(event.pointerId) } catch { /* Synthetic pointers cannot be captured. */ }
      updateFromPointer(event)
      joystick.classList.add('is-active')
    }
    const move = (event) => {
      if (this.touch.pointerId === event.pointerId) updateFromPointer(event)
    }
    const end = (event) => {
      if (this.touch.pointerId !== event.pointerId) return
      this.touch.active = false
      this.touch.pointerId = null
      this.touch.x = 0
      this.touch.z = 0
      this.touch.pressed.clear()
      if (knob) knob.style.transform = 'translate(0px, 0px)'
      joystick.classList.remove('is-active')
    }
    joystick.addEventListener('pointerdown', start)
    joystick.addEventListener('pointermove', move)
    joystick.addEventListener('pointerup', end)
    joystick.addEventListener('pointercancel', end)
    joystick.addEventListener('lostpointercapture', end)
  }

  pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []
    for (let slot = 0; slot < 2; slot += 1) {
      const pad = pads[slot]
      const previous = this.gamepads[slot]
      const state = {
        connected: Boolean(pad),
        x: 0,
        z: 0,
        buttons: {},
        pressed: {},
        released: {}
      }
      if (pad) {
        const deadzone = 0.22
        const ax = pad.axes[0] || 0
        const ay = pad.axes[1] || 0
        if (Math.abs(ax) > deadzone) state.x = ax
        if (Math.abs(ay) > deadzone) state.z = -ay
        for (const [action, indices] of Object.entries(GAMEPAD_BUTTONS)) {
          const isDown = indices.some((i) => pad.buttons[i]?.pressed)
          state.buttons[action] = isDown
          state.pressed[action] = isDown && !previous[action]
          state.released[action] = !isDown && Boolean(previous[action])
        }
      } else if (previous.connected) {
        for (const action of ACTIONS) state.released[action] = Boolean(previous[action])
      }
      this.gamepads[slot] = state
    }
  }

  getTouchState() {
    return this.touch
  }

  getState(slot, scheme = 'classic') {
    const mapping = KEYMAPS[scheme]?.[slot] || KEYMAPS.classic[slot]
    let x = 0
    let z = 0
    const down = emptyActions()
    const pressed = emptyActions()
    const released = emptyActions()
    const pad = this.gamepads[slot]

    if (pad?.connected) {
      x = pad.x
      z = pad.z
      for (const action of ACTIONS) {
        down[action] = Boolean(pad.buttons[action])
        pressed[action] = Boolean(pad.pressed[action])
        released[action] = Boolean(pad.released[action])
      }
    }

    for (const [code, action] of Object.entries(mapping)) {
      if (this.down.has(code)) {
        if (action === 'up') z += 1
        else if (action === 'down') z -= 1
        else if (action === 'left') x -= 1
        else if (action === 'right') x += 1
        else down[action] = true
      }
      if (this.pressed.has(code)) {
        if (ACTIONS.includes(action)) pressed[action] = true
      }
      if (this.released.has(code)) {
        if (ACTIONS.includes(action)) released[action] = true
      }
    }

    if (slot === 0) {
      if (this.touch.active) {
        x += this.touch.x
        z += this.touch.z
      }
      for (const action of ACTIONS) {
        if (this.touch.actions[action]) down[action] = true
        if (this.touch.pressed.has(action)) pressed[action] = true
        if (this.touch.released.has(action)) released[action] = true
      }
    }

    const length = Math.hypot(x, z)
    if (length > 1) {
      x /= length
      z /= length
    }
    return { x, z, down, pressed, released }
  }

  endFrame() {
    this.pressed.clear()
    this.released.clear()
    this.touch.pressed.clear()
    this.touch.released.clear()
  }

  clearTransient() {
    this.pressed.clear()
    this.released.clear()
    this.touch.pressed.clear()
    this.touch.released.clear()
  }
}
