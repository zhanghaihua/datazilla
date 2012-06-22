from ..blobs import perftest_json


def test_claim_objects(dm):
    """``claim_objects`` claims & returns unclaimed rows up to a limit."""
    blobs = [
        perftest_json(testrun={"date": "1330454755"}),
        perftest_json(testrun={"date": "1330454756"}),
        perftest_json(testrun={"date": "1330454757"}),
        ]

    for blob in blobs:
        dm.store_test_data(blob)

    rows1 = dm.claim_objects(2)

    # a separate worker with a separate connection
    from datazilla.model import DatazillaModel
    dm2 = DatazillaModel("testproj")

    rows2 = dm2.claim_objects(2)

    loading_rows = dm.sources["objectstore"].dhub.execute(
        proc="objectstore_test.counts.loading")[0]["loading_count"]

    assert len(rows1) == 2
    # second worker asked for two rows but only got one that was left
    assert len(rows2) == 1

    # all three blobs were fetched by one of the workers
    assert set([r["json_blob"] for r in rows1 + rows2]) == set(blobs)

    # the blobs are all marked as "loading" in the database
    assert loading_rows == 3


def test_mark_object_complete(dm):
    """Marks claimed row complete and records run id."""
    dm.store_test_data(perftest_json())
    row_id = dm.claim_objects(1)[0]["id"]
    test_run_id = 7 # any arbitrary number; no cross-db constraint checks

    dm.mark_object_complete(row_id, test_run_id)

    row_data = dm.sources["objectstore"].dhub.execute(
        proc="objectstore_test.selects.row", placeholders=[row_id])[0]

    assert row_data["test_run_id"] == test_run_id
    assert row_data["processed_flag"] == "complete"


def test_get_operating_systems(dm):
    dm.get_operating_systems()


def test_get_tests(dm):
    dm.get_tests()


def test_get_products(dm):
    dm.get_products()


def test_get_machines(dm):
    dm.get_machines()


def test_get_options(dm):
    dm.get_options()


def test_get_pages(dm):
    dm.get_pages()


def test_get_aux_data(dm):
    dm.get_aux_data()


def test_get_ref(dm):
    dm.get_reference_data()


def test_get_test_collections(dm):
    dm.get_test_collections()


def test_get_test_reference_data(dm):
    dm.get_test_reference_data()


def test_get_product_test_os_map(dm):
    dm.get_product_test_os_map()


def test_get_summary_cache(dm):
    dm.get_summary_cache(10, 'days_30')
