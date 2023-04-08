import { parseGolemFile } from '../src/parser';
import fs from 'fs';

describe('Golem file parsing tests', () => {
  test('Valid Golem file', () => {
    const golemFileContent = fs.readFileSync('valid_golem_file.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    expect(golemFile.default).toBeDefined();
    expect(golemFile.say_hello?.prompt).toBe("Generate a 'Hello, world!' message.");
  });

  test('Golem file with multiple targets', () => {
    const golemFileContent = fs.readFileSync('multiple_targets_golem_file.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    expect(golemFile.default).toBeDefined();
    expect(golemFile.greet_person?.prompt).toBe("{{get_greeting}} {{get_name}}.");
    expect(golemFile.get_name?.prompt).toBe("Provide a person's name.");
    expect(golemFile.get_greeting?.prompt).toBe("Generate a greeting word.");
  });

  test('Invalid Golem file (missing default target)', () => {
    const golemFileContent = fs.readFileSync('missing_default_target_golem_file.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    expect(golemFile.default).toBeUndefined();
  });

  test('Invalid Golem file (missing dependency)', () => {
    const golemFileContent = fs.readFileSync('missing_dependency_golem_file.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    expect(golemFile.default).toBeDefined();
    expect(golemFile.greet_person?.prompt).toBe("{{get_greeting}} {{get_name}}.");
    expect(golemFile.get_name?.prompt).toBe("Provide a person's name.");
    expect(golemFile.get_greeting).toBeUndefined();
  });

  test('Golem file with model configuration', () => {
    const golemFileContent = fs.readFileSync('model_configuration_golem_file.yaml', 'utf-8');
    const golemFile = parseGolemFile(golemFileContent);

    expect(golemFile.default).toBeDefined();
    expect(golemFile.generate_message?.model).toBe('gpt-3.5-turbo');
    expect(golemFile.generate_message?.prompt).toBe("Create a unique message that includes the word 'cache'.");
  });
});
