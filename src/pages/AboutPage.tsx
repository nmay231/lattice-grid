import { Container, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";

export const AboutPage = () => {
    return (
        <Paper m="lg">
            <Container size="sm">
                <Title order={1}>About Lattice Grid</Title>
                <Stack mt="sm">
                    <Text>
                        The vision of this project is to provide an interface for making pencil
                        puzzles and developing puzzle variants without in-depth coding knowledge.
                        This is an alpha release to get the word out and to get early feedback (and
                        to see if I&#39;m not completely crazy).
                    </Text>
                    <Text>Here are some of the eventual goals this project hopes to achieve.</Text>
                    <ul>
                        <li>
                            Short URLs for simple puzzles. Puzzle sites tend to either
                            <ol>
                                <li>
                                    Encode each puzzle variant in a customized format which works
                                    well for the intended case, but not for variants using
                                    similar/additional logic, or
                                </li>
                                <li>
                                    Encode it in a general format without worrying about length and
                                    requiring the user to use a url shortener.
                                </li>
                            </ol>
                            We will solve this by attempting multiple formats optimized to different
                            use-cases and picking whichever is shortest.
                        </li>
                        <li>Reorder drawing layers.</li>
                        <li>Built-in extensively customizable drawing objects.</li>
                        <li>
                            Create and share puzzle variants without installing browser extensions.
                        </li>
                        <li>Step-solver and uniqueness prover.</li>
                        <li>Multiple grids or puzzles in the same URL.</li>
                    </ul>
                    <Text>
                        The GitHub project will be private for now until it is less of a mess than
                        it is at the moment. When it goes public, it will be under the MIT license
                        and open to contributions.
                    </Text>
                    <Link to="/edit">Back to editing</Link>
                </Stack>
            </Container>
        </Paper>
    );
};
