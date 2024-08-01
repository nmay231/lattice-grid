import { Button, Container, Paper, Stack, Text, Title } from "@mantine/core";
import { Link } from "wouter";

export const AboutPageContent = () => {
    return (
        <Container size="sm">
            <Title order={1}>About Lattice Grid</Title>
            <Stack mt="sm">
                <Text>
                    Latgrid is an open-source project I have worked on for almost three years now.
                    The main goal is to make it very easy to encode your own puzzle variants with
                    granular control for how answer check and controls work. However, those are hard
                    to get right and require a large foundation to be complete. Nonetheless,
                    I&apos;ve already implemented a few features that I think will interest you.
                </Text>
                <ul>
                    <li>
                        <b>Easy Mobile interactions.</b> You are able to create puzzles with large
                        grids using zoom+pan or draw+pan (if you draw with one finger, you can pan
                        with the other).
                    </li>
                    <li>
                        <b>Short URLs.</b> Currently, I base64-encode a binary format adapted from{" "}
                        <Link to="https://protobuf.dev/">Protobuf</Link>, but future plans include
                        optimized formats for common puzzle formats (e.g. Sudoku and many of its
                        variants) as well compression for any substantial URL.
                    </li>
                    <li>
                        <b>Invisible mistakes are impossible.</b> Things like drawing black lines
                        over grid lines or leaving a number outside the grid can cause issues with
                        answer check because you didn&apos;t realize you left an
                        invisible/hard-to-see object that is answer-checked. These are considered
                        bugs and are now impossible.
                    </li>
                    <li>
                        <b> Session Management.</b> While the goal will always be to make it easy to
                        store a copy of all of your puzzles offline using urls, it is also very
                        convenient to be able to refresh the page without deleting your progress and
                        review all of your previous puzzles in the same app.
                    </li>
                    <li>
                        <b> Batched undos.</b> Drawing is undone per interaction instead of per
                        object (it&apos;s best learned by seeing it yourself). Additionally, major
                        modifications like resizing the grid do not clear undo history.
                    </li>
                </ul>
                <Text>
                    Don&apos;t get me wrong, this project still needs work. But I have a vision for
                    what I want from this project. Here are some of the eventual goals I hope to
                    achieve.
                </Text>
                <ul>
                    <li>
                        Finer control over how objects are drawn. Right now, I already allow
                        changing the draw order, but there are use-cases where duplicate layers are
                        used to draw objects in front of and behind other ones, e.g. numbers in
                        front of or behind colors, where you only know about the ones behind when
                        you clear the color somehow.
                    </li>
                    <li>
                        Built-in extensively customizable drawing objects. Imagine you want to draw
                        a &quot;snake&quot; object with a triangle for a head and a circle for a
                        tail. I have a few ideas for how that can be done.
                    </li>
                    <li>
                        Create and share puzzle variants without running arbitrary javascript. (Of
                        course, you have to trust the javascript that I write, but that is all
                        open-source anyways.)
                    </li>
                    <li>
                        By encoding your variant into constraints, I hope to provide a generalized
                        step-solver and uniqueness prover.
                    </li>
                    <li>
                        Multiple grids or puzzles in the same URL. Useful for some cheeky
                        bifurcation, or for publishing a whole collection of puzzles.
                    </li>
                </ul>
                <Text>
                    The <Link to="https://github.com/nmay231/lattice-grid">GitHub project</Link> is
                    available right now! It is under the MIT license and open to bug reports and
                    feature requests. But if you do have a feature request, be ready to hear no, and{" "}
                    <i>always</i> open an issue before contributing a pull request. I already have a
                    vision for how certain things will work and just need to find time and
                    motivation to actually implement it. That said, I am looking forward to your
                    feedback!
                </Text>
            </Stack>
        </Container>
    );
};

// TODO: I like this as a modal, but need to figure out how to make it a page or at least a url for SEO purposes.
// Perhaps I can put the previous url as a query parameter?
export const AboutPage = () => {
    const freshPage = !document.referrer.startsWith(location.origin);
    const previousURL = freshPage ? "/edit" : document.referrer;
    return (
        <Paper m="lg">
            <AboutPageContent />
            {freshPage ? (
                <Button component="a" color="cyan" href={previousURL}>
                    Get started making a puzzle
                </Button>
            ) : (
                <Button component="a" color="cyan">
                    Go back
                </Button>
            )}
        </Paper>
    );
};
