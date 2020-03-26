Feature: Package Smart Contract
  Package smart contracts for each of the languages

  Scenario Outline: Package Smart Contract
    Given a '<language>' smart contract of type '<type>'
    When I package the smart contract
    Then a package should exist
    Examples:
    | language   | type   |
    | javascript | node   |
    | typescript | node   |
    | java       | java   |
    | go         | golang |

  Scenario Outline: Get list of files
    Given a '<language>' smart contract of type '<type>'
    And the package exists
    When I get the list of files from a file
    Then the file list is correct '<fileList>'
    Examples:
      | language   | type   | fileList                                                                                                                                                                                     |
      | javascript | node   | metadata.json src/.editorconfig src/.eslintignore src/.eslintrc.js src/.gitignore src/index.js src/lib/fabcar.js src/package.json                                                            |
      | typescript | node   | metadata.json src/.editorconfig src/.gitignore src/dist/car.d.ts src/dist/car.js src/dist/car.js.map src/package-lock.json src/package.json src/src/car.ts src/tsconfig.json src/tslint.json |
      | java       | java   | metadata.json src/fabcar-1.0-SNAPSHOT.jar src/lib/genson-1.5.jar                                                                                                                             |
      | go         | golang | metadata.json src/fabcar.go src/go.mod src/go.sum src/vendor/google.golang.org/grpc/backoff.go                                                                                               |
