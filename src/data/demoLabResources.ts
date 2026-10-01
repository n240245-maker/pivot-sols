import { prototypeBranches, prototypeSemesters } from '../config/academicResources'
import type { Lab, LabCatalog, LabExperiment } from '../types/labVideos'

// Small presentation examples only. This is not the official RGUKT syllabus.
// No video URLs have been supplied or approved yet.
const circuitPrecautions = [
  'Check component values and the instructor-approved supply limits before powering the circuit.',
  'Avoid short circuits. Switch off the supply before modifying connections.',
  'Use only a supervised, low-voltage teaching circuit; follow your lab manual.',
] as const

const networkExperiments: readonly LabExperiment[] = [
  {
    id: 'thevenin', slug: 'verification-of-thevenins-theorem', title: "Verification of Thevenin's Theorem", experimentNumber: 1,
    objective: 'Verify that a resistive network and its Thevenin equivalent produce approximately the same current through a given load.',
    apparatus: ['DC supply', 'Resistors', 'Breadboard', 'Multimeter', 'Connecting wires'],
    theory: "Thevenin's theorem states that a linear bilateral network can be replaced at two terminals by an equivalent voltage source in series with an equivalent resistance. For this prototype, use a resistive DC network with independent sources.",
    procedure: [
      'With the supply off, construct the instructor-provided network and check all connections.',
      'Disconnect the load, power the circuit within its approved limits, and measure the open-circuit terminal voltage. This is the Thevenin voltage.',
      'Switch off and disconnect the physical supply. In the equivalent circuit calculation, replace ideal independent voltage sources with shorts and ideal independent current sources with open circuits. Never short a live supply.',
      'Determine the equivalent resistance looking into the load terminals with the sources deactivated.',
      'Construct the Thevenin equivalent using the calculated resistance and measured voltage; connect the same load with the supply off.',
      'Measure the load current in each circuit and compare the results, noting resistor tolerance and measurement error.',
    ],
    expectedResult: 'The measured load current should closely match the current obtained from the Thevenin equivalent circuit, within component and measurement tolerances.',
    precautions: circuitPrecautions,
  },
  {
    id: 'norton', slug: 'verification-of-nortons-theorem', title: "Verification of Norton's Theorem", experimentNumber: 2,
    objective: 'Compare the load current of a resistive DC network with its Norton equivalent.',
    theory: 'The Norton equivalent represents a linear network by a current source in parallel with a resistance. For an independent-source resistive network, the resistance equals the Thevenin resistance.',
    expectedResult: 'Both circuits give approximately the same current through the same load.', precautions: circuitPrecautions,
  },
  {
    id: 'maximum-power', slug: 'maximum-power-transfer-theorem', title: 'Maximum Power Transfer Theorem', experimentNumber: 3,
    objective: 'Observe how load power changes as a resistive load is varied.',
    theory: 'For a DC network with positive Thevenin resistance, maximum load power occurs when the load resistance equals the Thevenin resistance.',
    expectedResult: 'A plot of load power against load resistance peaks near the Thevenin resistance.', precautions: circuitPrecautions,
  },
  {
    id: 'rc-transient', slug: 'rc-transient-response', title: 'RC Transient Response', experimentNumber: 4,
    objective: 'Observe the charging and discharging voltage of a capacitor in a series RC circuit.',
    theory: 'The time constant of a simple RC circuit is R × C. It describes how quickly the capacitor voltage approaches its final value.',
    expectedResult: 'The measured waveform follows an exponential response with a time constant close to R × C.',
    precautions: [...circuitPrecautions, 'Discharge the capacitor safely using the method specified by your instructor before handling it.'],
  },
  {
    id: 'rl-transient', slug: 'rl-transient-response', title: 'RL Transient Response', experimentNumber: 5,
    objective: 'Observe the change in current after a step input to a series RL circuit.',
    theory: 'The time constant of a simple RL circuit is L / R, where R includes the resistance in the current path.',
    expectedResult: 'Current approaches its final value gradually, with a time constant close to L / R.', precautions: circuitPrecautions,
  },
  {
    id: 'rlc-response', slug: 'rlc-circuit-response', title: 'RLC Circuit Response', experimentNumber: 6,
    objective: 'Compare the transient responses of a series RLC circuit at different resistance values.',
    theory: 'Resistance changes the damping of an RLC circuit. Depending on its component values, a step response may oscillate or approach its final value without oscillation.',
    expectedResult: 'Recorded waveforms illustrate the effect of damping on the circuit response.', precautions: circuitPrecautions,
  },
]

const devicesExperiments: readonly LabExperiment[] = [
  { id: 'pn-diode', slug: 'pn-junction-diode-characteristics', title: 'PN Junction Diode Characteristics', experimentNumber: 1, objective: 'Plot diode current against applied voltage for an instructor-approved range.', expectedResult: 'Forward and reverse bias produce distinctly different current–voltage characteristics.', precautions: circuitPrecautions },
  { id: 'zener', slug: 'zener-diode-characteristics', title: 'Zener Diode Characteristics', experimentNumber: 2, objective: 'Observe the reverse-bias voltage regulation region of a Zener diode with a current-limiting resistor.', expectedResult: 'The voltage varies relatively little over the permitted regulation current range.', precautions: circuitPrecautions },
  { id: 'half-wave', slug: 'half-wave-rectifier', title: 'Half-Wave Rectifier', experimentNumber: 3, objective: 'Observe the output waveform of a diode rectifier using an isolated low-voltage AC source.', expectedResult: 'The load receives pulses during one half of each AC cycle.', precautions: circuitPrecautions },
  { id: 'full-wave', slug: 'full-wave-rectifier', title: 'Full-Wave Rectifier', experimentNumber: 4, objective: 'Observe full-wave rectification using an isolated low-voltage AC source.', expectedResult: 'Both input half-cycles produce load current in the same direction.', precautions: circuitPrecautions },
  { id: 'bjt', slug: 'bjt-input-and-output-characteristics', title: 'BJT Input and Output Characteristics', experimentNumber: 5, objective: 'Plot the input and output characteristics of an instructor-provided common-emitter BJT circuit.', expectedResult: 'The plots show how base current and collector-emitter voltage affect collector current.', precautions: circuitPrecautions },
]

const programmingExperiments: readonly LabExperiment[] = [
  { id: 'input-output', slug: 'basic-input-and-output', title: 'Basic Input and Output', experimentNumber: 1, objective: 'Read two integers in C and display their sum.', apparatus: ['Computer', 'C compiler', 'Text editor'], procedure: ['Write a program that reads two integers, checking that input succeeds.', 'Compile the program and resolve warnings.', 'Run it with positive, negative and zero values within the integer range.'], expectedResult: 'The displayed sum matches each pair of valid inputs.' },
  { id: 'functions', slug: 'functions', title: 'Functions', experimentNumber: 2, objective: 'Organize a calculation into a C function with parameters and a return value.', expectedResult: 'Calling the function with known inputs returns the expected output.' },
  { id: 'arrays', slug: 'arrays', title: 'Arrays', experimentNumber: 3, objective: 'Store a fixed collection of integers and find its largest element.', expectedResult: 'The program finds the correct maximum without accessing outside the array bounds.' },
  { id: 'strings', slug: 'strings', title: 'Strings', experimentNumber: 4, objective: 'Read and process a bounded, null-terminated character array in C.', expectedResult: 'The program handles text within the buffer capacity and terminates the string correctly.' },
  { id: 'structures', slug: 'structures', title: 'Structures', experimentNumber: 5, objective: 'Group related fields into a C structure and display a sample record.', expectedResult: 'Each field is stored and displayed with the expected value.' },
  { id: 'recursion', slug: 'recursion', title: 'Recursion', experimentNumber: 6, objective: 'Implement factorial using recursion for a small, non-negative integer.', theory: 'A recursive function calls itself on a smaller problem and stops at a base case.', expectedResult: 'Results match known factorial values within the chosen integer type’s range.', precautions: ['Validate input and limit its size to avoid integer overflow and excessive recursion.'] },
]

const measurementExperiments: readonly LabExperiment[] = [
  { id: 'vernier', slug: 'vernier-caliper-measurement', title: 'Measurement with a Vernier Caliper', experimentNumber: 1, objective: 'Measure a small object using a vernier caliper and record the instrument’s least count.', apparatus: ['Vernier caliper', 'Small cylindrical object'], procedure: ['Identify the main scale and vernier scale, then check for zero error.', 'Place the object gently between the appropriate jaws.', 'Read the main scale and coinciding vernier division, applying any zero correction.', 'Repeat the measurement at several positions and record the readings with units.'], expectedResult: 'Repeated readings agree within the instrument’s measurement resolution.', precautions: ['Do not force the jaws against the object.', 'Follow the reading method for the instrument provided by your instructor.'] },
]

function lab(curriculumId: string, semester: 1 | 2, slug: string, name: string, shortDescription: string, experiments: readonly LabExperiment[] = []): Lab {
  return { id: `${curriculumId}-${semester}-${slug}`, curriculumId, semesterId: `semester-${semester}`, slug, name, shortDescription, experiments }
}

export const demoLabResources: LabCatalog = {
  demo: true,
  curricula: [
    { id: 'common', level: 'P1', semesters: prototypeSemesters },
    ...prototypeBranches.map(branch => ({ id: branch.id, level: 'E1' as const, branch, semesters: prototypeSemesters })),
  ],
  labs: [
    lab('common', 1, 'physics-lab', 'Physics Lab', 'Build confidence with measurement and observation.', measurementExperiments),
    lab('common', 1, 'chemistry-lab', 'Chemistry Lab', 'Explore introductory chemistry practicals.'),
    lab('common', 1, 'english-language-lab', 'English Language Lab', 'Practice listening and communication.'),
    lab('common', 2, 'physics-lab-ii', 'Physics Lab II', 'Continue exploring physical principles.'),
    lab('common', 2, 'programming-lab', 'Programming Lab', 'Turn programming concepts into working examples.', programmingExperiments),
    lab('common', 2, 'engineering-drawing-workshop', 'Engineering Drawing / Workshop', 'An introduction to drawing and workshop practice.'),
    lab('ece', 1, 'network-theory-lab', 'Network Theory Lab', 'Explore circuit equivalents and transient responses.', networkExperiments),
    lab('ece', 1, 'electronic-devices-lab', 'Electronic Devices Lab', 'Observe diodes, rectifiers and transistors.', devicesExperiments),
    lab('ece', 1, 'c-programming-lab', 'C Programming Lab', 'Practice the building blocks of C.', programmingExperiments),
    lab('ece', 2, 'analog-electronics-lab', 'Analog Electronics Lab', 'Explore practical analog circuits.'),
    lab('ece', 2, 'digital-electronics-lab', 'Digital Electronics Lab', 'Connect logic concepts with circuit behavior.'),
    lab('ece', 2, 'electrical-machines-lab', 'Electrical Machines Lab', 'An introduction to electrical machine experiments.'),
    lab('cse', 1, 'c-programming-lab', 'C Programming Lab', 'Practice the building blocks of C.', programmingExperiments),
    lab('cse', 1, 'data-structures-lab', 'Data Structures Lab', 'Explore ways to organize and work with data.'),
    lab('cse', 1, 'digital-logic-lab', 'Digital Logic Lab', 'Experiment with the foundations of digital systems.'),
    lab('cse', 2, 'oop-lab', 'OOP Lab', 'Practice object-oriented programming concepts.'),
    lab('cse', 2, 'dbms-lab', 'DBMS Lab', 'Explore database design and queries.'),
    lab('cse', 2, 'algorithms-lab', 'Algorithms Lab', 'Study algorithms through implementation.'),
  ],
}
