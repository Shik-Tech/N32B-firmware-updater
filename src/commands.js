const SET_KNOB_MODE = 1;         // Define knob mode (see KNOB_MODES)
const SAVE_PRESET = 2;           // Save the preset
const LOAD_PRESET = 3;           // Load a preset
const SEND_FIRMWARE_VERSION = 4; // Send the device firmware version
const SYNC_KNOBS = 5;            // Send active preset
const CHANGE_CHANNEL = 6;        // Changes the global MIDI channel
const START_SYSEX_MESSAGE = 7;   // Announce start of sysEx mesasge
const SET_THRU_MODE = 8;         // Set Thru Mode
const SET_OUTPUT_MODE = 9;       // Set OUTPUT mode
const END_OF_TRANSMISSION = 99;  // Notify end of transmission

export {
    SET_KNOB_MODE,
    SAVE_PRESET,
    LOAD_PRESET,
    SEND_FIRMWARE_VERSION,
    SYNC_KNOBS,
    CHANGE_CHANNEL,
    START_SYSEX_MESSAGE,
    SET_THRU_MODE,
    SET_OUTPUT_MODE,
    END_OF_TRANSMISSION
};