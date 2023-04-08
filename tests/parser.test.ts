import { parseGolemFile } from '../src/parser';

describe('Parser', () => {
  it('should parse a valid Golem file', () => {
    const golemFileContent = `
    default:
      dependencies:
        - example_target

    example_target:
      prompt: "Answer this example question."
    `;
    const parsedGolemFile = parseGolemFile(golemFileContent);
    expect(parsedGolemFile).toBeInstanceOf(Object); // Adjust the expectation based on your test case
  });

  // Add more test cases here
});
